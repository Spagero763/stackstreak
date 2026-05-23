;; TicTacToe
;; Fully on-chain, two-player Tic-Tac-Toe on Stacks.
;;
;; Anyone can open a game (becomes X). Anyone else can join it (becomes O).
;; Players then alternate moves, each move a single transaction. The contract
;; validates turns and moves, detects wins/draws, and keeps win/loss records.
;;
;; No wager, no admin keys. Board cells: u0 empty, u1 = X, u2 = O.

;; --- Errors ---
(define-constant ERR-NOT-FOUND (err u200))
(define-constant ERR-NOT-OPEN (err u201))
(define-constant ERR-CANNOT-JOIN-OWN (err u202))
(define-constant ERR-NOT-ACTIVE (err u203))
(define-constant ERR-NOT-YOUR-TURN (err u204))
(define-constant ERR-CELL-TAKEN (err u205))
(define-constant ERR-BAD-POSITION (err u206))
(define-constant ERR-NO-OPPONENT (err u207))

;; --- Status codes ---
(define-constant STATUS-OPEN u0) ;; waiting for an opponent
(define-constant STATUS-ACTIVE u1) ;; in progress
(define-constant STATUS-X-WON u2)
(define-constant STATUS-O-WON u3)
(define-constant STATUS-DRAW u4)

(define-constant EMPTY-BOARD (list u0 u0 u0 u0 u0 u0 u0 u0 u0))

;; --- State ---
(define-data-var game-counter uint u0)

(define-map games
  uint
  {
    player-x: principal,
    player-o: (optional principal),
    board: (list 9 uint),
    turn: uint, ;; u1 = X to move, u2 = O to move
    status: uint,
    winner: (optional principal),
    created-at: uint,
  }
)

(define-map records
  principal
  {
    wins: uint,
    losses: uint,
    draws: uint,
  }
)

(define-constant EMPTY-RECORD {
  wins: u0,
  losses: u0,
  draws: u0,
})

;; --- Private helpers ---

(define-private (cell
    (b (list 9 uint))
    (i uint)
  )
  (default-to u0 (element-at? b i))
)

(define-private (line
    (b (list 9 uint))
    (a uint)
    (c uint)
    (d uint)
    (m uint)
  )
  (and
    (is-eq (cell b a) m)
    (is-eq (cell b c) m)
    (is-eq (cell b d) m)
  )
)

(define-private (is-winner
    (b (list 9 uint))
    (m uint)
  )
  (or
    (line b u0 u1 u2 m)
    (line b u3 u4 u5 m)
    (line b u6 u7 u8 m)
    (line b u0 u3 u6 m)
    (line b u1 u4 u7 m)
    (line b u2 u5 u8 m)
    (line b u0 u4 u8 m)
    (line b u2 u4 u6 m)
  )
)

(define-private (board-full (b (list 9 uint)))
  (is-none (index-of? b u0))
)

(define-private (bump-wins (who principal))
  (let ((r (default-to EMPTY-RECORD (map-get? records who))))
    (map-set records who (merge r { wins: (+ (get wins r) u1) }))
  )
)

(define-private (bump-losses (who principal))
  (let ((r (default-to EMPTY-RECORD (map-get? records who))))
    (map-set records who (merge r { losses: (+ (get losses r) u1) }))
  )
)

(define-private (bump-draws (who principal))
  (let ((r (default-to EMPTY-RECORD (map-get? records who))))
    (map-set records who (merge r { draws: (+ (get draws r) u1) }))
  )
)

;; --- Public ---

;; Open a new game. Caller becomes X. Returns the new game id.
(define-public (create-game)
  (let ((id (+ (var-get game-counter) u1)))
    (map-set games id {
      player-x: tx-sender,
      player-o: none,
      board: EMPTY-BOARD,
      turn: u1,
      status: STATUS-OPEN,
      winner: none,
      created-at: burn-block-height,
    })
    (var-set game-counter id)
    (print {
      event: "create",
      id: id,
      player-x: tx-sender,
    })
    (ok id)
  )
)

;; Join an open game as O.
(define-public (join-game (id uint))
  (let ((game (unwrap! (map-get? games id) ERR-NOT-FOUND)))
    (asserts! (is-eq (get status game) STATUS-OPEN) ERR-NOT-OPEN)
    (asserts! (not (is-eq tx-sender (get player-x game))) ERR-CANNOT-JOIN-OWN)
    (map-set games id
      (merge game {
        player-o: (some tx-sender),
        status: STATUS-ACTIVE,
      })
    )
    (print {
      event: "join",
      id: id,
      player-o: tx-sender,
    })
    (ok true)
  )
)

;; Place your mark at position 0-8 in an active game.
(define-public (play-move
    (id uint)
    (pos uint)
  )
  (let (
      (game (unwrap! (map-get? games id) ERR-NOT-FOUND))
      (turn (get turn game))
      (mark (if (is-eq turn u1) u1 u2))
      (mover (if (is-eq turn u1)
        (get player-x game)
        (unwrap! (get player-o game) ERR-NO-OPPONENT)
      ))
    )
    (asserts! (is-eq (get status game) STATUS-ACTIVE) ERR-NOT-ACTIVE)
    (asserts! (is-eq tx-sender mover) ERR-NOT-YOUR-TURN)
    (asserts! (< pos u9) ERR-BAD-POSITION)
    (asserts! (is-eq (cell (get board game) pos) u0) ERR-CELL-TAKEN)
    (let (
        (new-board (unwrap! (replace-at? (get board game) pos mark) ERR-BAD-POSITION))
        (won (is-winner new-board mark))
        (full (board-full new-board))
        (opponent (if (is-eq turn u1)
          (unwrap! (get player-o game) ERR-NO-OPPONENT)
          (get player-x game)
        ))
        (new-status (if won
          (if (is-eq mark u1)
            STATUS-X-WON
            STATUS-O-WON
          )
          (if full
            STATUS-DRAW
            STATUS-ACTIVE
          )
        ))
      )
      (map-set games id
        (merge game {
          board: new-board,
          turn: (if (is-eq turn u1)
            u2
            u1
          ),
          status: new-status,
          winner: (if won
            (some tx-sender)
            none
          ),
        })
      )
      (if won
        (begin
          (bump-wins tx-sender)
          (bump-losses opponent)
        )
        (if full
          (begin
            (bump-draws tx-sender)
            (bump-draws opponent)
          )
          false
        )
      )
      (print {
        event: "move",
        id: id,
        pos: pos,
        mark: mark,
        status: new-status,
        player: tx-sender,
      })
      (ok new-status)
    )
  )
)

;; --- Read-only ---

(define-read-only (get-game (id uint))
  (map-get? games id)
)

(define-read-only (get-game-count)
  (var-get game-counter)
)

(define-read-only (get-record (who principal))
  (default-to EMPTY-RECORD (map-get? records who))
)
