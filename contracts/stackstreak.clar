;; StackStreak
;; A fully on-chain, provably-fair daily game on Stacks.
;;
;; Tap to play -> the contract derives a fair score (1-100) from on-chain
;; entropy (your address + the current Bitcoin/Stacks block + your play count),
;; then updates your stats, your daily streak, and the global leaderboard.
;;
;; No wagering, no house, no admin keys. Every play is a single transaction.

;; --- Errors ---
(define-constant ERR-LEADERBOARD-FULL (err u100))

;; --- Config ---
(define-constant MAX-PLAYERS u2000)
;; Bitcoin produces ~144 blocks/day; we bucket time by burn-block height.
(define-constant BLOCKS-PER-DAY u144)

(define-constant EMPTY-STATS {
  plays: u0,
  total-score: u0,
  best-score: u0,
  streak: u0,
  best-streak: u0,
  last-day: u0,
})

;; --- State ---
;; Registry of distinct players (appended once, on a player's first play).
(define-data-var players (list 2000 principal) (list))
(define-data-var total-plays uint u0)
;; Current champion by cumulative score, for cheap on-chain display.
(define-data-var top-player (optional principal) none)
(define-data-var top-score uint u0)

(define-map stats
  principal
  {
    plays: uint,
    total-score: uint,
    best-score: uint,
    streak: uint,
    best-streak: uint,
    last-day: uint,
  }
)

;; --- Private helpers ---

;; Day bucket derived from the Bitcoin burn-block height.
(define-private (current-day)
  (/ burn-block-height BLOCKS-PER-DAY)
)

;; Provably-fair roll in [1, 100]. Deterministic from the player, the current
;; block heights, and the player's incrementing play count, so each play of a
;; given wallet yields a different result that nobody can reuse.
(define-private (roll
    (who principal)
    (nonce uint)
  )
  (let (
      (seed (unwrap-panic (to-consensus-buff? {
        w: who,
        b: burn-block-height,
        s: stacks-block-height,
        n: nonce,
      })))
      (digest (sha256 seed))
      (chunk (unwrap-panic (as-max-len? (unwrap-panic (slice? digest u0 u16)) u16)))
    )
    (+ u1 (mod (buff-to-uint-be chunk) u100))
  )
)

;; Streak rules: first play = 1; same day = unchanged; next consecutive day =
;; +1; any gap = reset to 1.
(define-private (next-streak
    (last-day uint)
    (cur-streak uint)
    (today uint)
    (prev-plays uint)
  )
  (if (is-eq prev-plays u0)
    u1
    (if (is-eq today last-day)
      (if (is-eq cur-streak u0)
        u1
        cur-streak
      )
      (if (is-eq today (+ last-day u1))
        (+ cur-streak u1)
        u1
      )
    )
  )
)

(define-private (max-uint
    (a uint)
    (b uint)
  )
  (if (> a b)
    a
    b
  )
)

;; --- Public ---

;; Play once. Returns this play's score plus your updated totals.
(define-public (play)
  (let (
      (who tx-sender)
      (prev (default-to EMPTY-STATS (map-get? stats who)))
      (today (current-day))
      (is-new (is-eq (get plays prev) u0))
      (play-number (+ (get plays prev) u1))
      (score (roll who play-number))
      (new-streak (next-streak (get last-day prev) (get streak prev) today (get plays prev)))
      (new-total (+ (get total-score prev) score))
      (new-best (max-uint score (get best-score prev)))
      (new-best-streak (max-uint new-streak (get best-streak prev)))
    )
    ;; Register first-time players into the leaderboard registry.
    (and is-new
      (var-set players
        (unwrap! (as-max-len? (append (var-get players) who) u2000) ERR-LEADERBOARD-FULL)
      )
    )
    (map-set stats who {
      plays: play-number,
      total-score: new-total,
      best-score: new-best,
      streak: new-streak,
      best-streak: new-best-streak,
      last-day: today,
    })
    (var-set total-plays (+ (var-get total-plays) u1))
    ;; Update the cumulative-score champion.
    (and (> new-total (var-get top-score))
      (begin
        (var-set top-score new-total)
        (var-set top-player (some who))
        true
      )
    )
    (print {
      event: "play",
      player: who,
      score: score,
      total: new-total,
      streak: new-streak,
      day: today,
      play-number: play-number,
    })
    (ok {
      score: score,
      total: new-total,
      streak: new-streak,
      best: new-best,
    })
  )
)

;; --- Read-only ---

(define-read-only (get-stats (who principal))
  (default-to EMPTY-STATS (map-get? stats who))
)

(define-read-only (get-players)
  (var-get players)
)

(define-read-only (get-player-count)
  (len (var-get players))
)

(define-read-only (get-total-plays)
  (var-get total-plays)
)

(define-read-only (get-top)
  {
    player: (var-get top-player),
    score: (var-get top-score),
  }
)

(define-read-only (get-today)
  (current-day)
)
