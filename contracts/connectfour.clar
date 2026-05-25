;; ConnectFour
;; Fully on-chain, two-player Connect Four on Stacks (7 columns x 6 rows).
;;
;; Open a game (X), let someone join (O), then drop discs into columns. The
;; contract validates turns, finds the landing row, and detects 4-in-a-row in
;; any direction. No wager, no admin keys. Cells: u0 empty, u1 X, u2 O.
;; Board index = row * 7 + col, row 0 at the bottom.

;; --- Errors ---
(define-constant ERR-NOT-FOUND (err u600))
(define-constant ERR-NOT-OPEN (err u601))
(define-constant ERR-CANNOT-JOIN-OWN (err u602))
(define-constant ERR-NOT-ACTIVE (err u603))
(define-constant ERR-NOT-YOUR-TURN (err u604))
(define-constant ERR-COLUMN-FULL (err u605))
(define-constant ERR-BAD-COLUMN (err u606))
(define-constant ERR-NO-OPPONENT (err u607))

;; --- Status ---
(define-constant STATUS-OPEN u0)
(define-constant STATUS-ACTIVE u1)
(define-constant STATUS-X-WON u2)
(define-constant STATUS-O-WON u3)
(define-constant STATUS-DRAW u4)

(define-constant EMPTY-BOARD (list
  u0 u0 u0 u0 u0 u0 u0
  u0 u0 u0 u0 u0 u0 u0
  u0 u0 u0 u0 u0 u0 u0
  u0 u0 u0 u0 u0 u0 u0
  u0 u0 u0 u0 u0 u0 u0
  u0 u0 u0 u0 u0 u0 u0
))

;; Every 4-in-a-row index window (horizontal, vertical, both diagonals).
(define-constant WINNING-LINES (list
  (list u0 u1 u2 u3)
  (list u1 u2 u3 u4)
  (list u2 u3 u4 u5)
  (list u3 u4 u5 u6)
  (list u7 u8 u9 u10)
  (list u8 u9 u10 u11)
  (list u9 u10 u11 u12)
  (list u10 u11 u12 u13)
  (list u14 u15 u16 u17)
  (list u15 u16 u17 u18)
  (list u16 u17 u18 u19)
  (list u17 u18 u19 u20)
  (list u21 u22 u23 u24)
  (list u22 u23 u24 u25)
  (list u23 u24 u25 u26)
  (list u24 u25 u26 u27)
  (list u28 u29 u30 u31)
  (list u29 u30 u31 u32)
  (list u30 u31 u32 u33)
  (list u31 u32 u33 u34)
  (list u35 u36 u37 u38)
  (list u36 u37 u38 u39)
  (list u37 u38 u39 u40)
  (list u38 u39 u40 u41)
  (list u0 u7 u14 u21)
  (list u7 u14 u21 u28)
  (list u14 u21 u28 u35)
  (list u1 u8 u15 u22)
  (list u8 u15 u22 u29)
  (list u15 u22 u29 u36)
  (list u2 u9 u16 u23)
  (list u9 u16 u23 u30)
  (list u16 u23 u30 u37)
  (list u3 u10 u17 u24)
  (list u10 u17 u24 u31)
  (list u17 u24 u31 u38)
  (list u4 u11 u18 u25)
  (list u11 u18 u25 u32)
  (list u18 u25 u32 u39)
  (list u5 u12 u19 u26)
  (list u12 u19 u26 u33)
  (list u19 u26 u33 u40)
  (list u6 u13 u20 u27)
  (list u13 u20 u27 u34)
  (list u20 u27 u34 u41)
  (list u0 u8 u16 u24)
  (list u1 u9 u17 u25)
  (list u2 u10 u18 u26)
  (list u3 u11 u19 u27)
  (list u3 u9 u15 u21)
  (list u4 u10 u16 u22)
  (list u5 u11 u17 u23)
  (list u6 u12 u18 u24)
  (list u7 u15 u23 u31)
  (list u8 u16 u24 u32)
  (list u9 u17 u25 u33)
  (list u10 u18 u26 u34)
  (list u10 u16 u22 u28)
  (list u11 u17 u23 u29)
  (list u12 u18 u24 u30)
  (list u13 u19 u25 u31)
  (list u14 u22 u30 u38)
  (list u15 u23 u31 u39)
  (list u16 u24 u32 u40)
  (list u17 u25 u33 u41)
  (list u17 u23 u29 u35)
  (list u18 u24 u30 u36)
  (list u19 u25 u31 u37)
  (list u20 u26 u32 u38)
))

;; --- State ---
(define-data-var game-counter uint u0)

(define-map games
  uint
  {
    player-x: principal,
    player-o: (optional principal),
    board: (list 42 uint),
    turn: uint,
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
    (b (list 42 uint))
    (i uint)
  )
  (default-to u0 (element-at? b i))
)

(define-private (line-won
    (ln (list 4 uint))
    (acc {
      b: (list 42 uint),
      m: uint,
      won: bool,
    })
  )
  (let (
      (b (get b acc))
      (m (get m acc))
      (all (and
        (is-eq (cell b (unwrap-panic (element-at? ln u0))) m)
        (is-eq (cell b (unwrap-panic (element-at? ln u1))) m)
        (is-eq (cell b (unwrap-panic (element-at? ln u2))) m)
        (is-eq (cell b (unwrap-panic (element-at? ln u3))) m)
      ))
    )
    (merge acc { won: (or (get won acc) all) })
  )
)

(define-private (is-winner
    (b (list 42 uint))
    (m uint)
  )
  (get won (fold line-won WINNING-LINES {
    b: b,
    m: m,
    won: false,
  }))
)

;; Lowest empty row (0-5) in a column, or none if full.
(define-private (landing
    (b (list 42 uint))
    (col uint)
  )
  (if (is-eq (cell b col) u0)
    (some u0)
    (if (is-eq (cell b (+ col u7)) u0)
      (some u1)
      (if (is-eq (cell b (+ col u14)) u0)
        (some u2)
        (if (is-eq (cell b (+ col u21)) u0)
          (some u3)
          (if (is-eq (cell b (+ col u28)) u0)
            (some u4)
            (if (is-eq (cell b (+ col u35)) u0)
              (some u5)
              none
            )
          )
        )
      )
    )
  )
)

(define-private (board-full (b (list 42 uint)))
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

;; Drop a disc into column 0-6.
(define-public (drop
    (id uint)
    (col uint)
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
    (asserts! (< col u7) ERR-BAD-COLUMN)
    (let (
        (row (unwrap! (landing (get board game) col) ERR-COLUMN-FULL))
        (pos (+ (* row u7) col))
        (new-board (unwrap! (replace-at? (get board game) pos mark) ERR-BAD-COLUMN))
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
        event: "drop",
        id: id,
        col: col,
        row: row,
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
