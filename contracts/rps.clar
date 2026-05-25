;; RPS - Rock Paper Scissors vs the contract
;; Single-player, provably-fair. move: u0 rock, u1 paper, u2 scissors.
;; The contract picks its move from on-chain entropy and scores the round.
;; Every play is one transaction.

(define-constant ERR-BAD-MOVE (err u400))

(define-constant EMPTY {
  plays: u0,
  wins: u0,
  losses: u0,
  draws: u0,
  streak: u0,
  best-streak: u0,
})

(define-data-var total-plays uint u0)
(define-data-var top-streak uint u0)
(define-data-var top-holder (optional principal) none)

(define-map stats
  principal
  {
    plays: uint,
    wins: uint,
    losses: uint,
    draws: uint,
    streak: uint,
    best-streak: uint,
  }
)

(define-private (house-move
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
      (chunk (unwrap-panic (as-max-len? (unwrap-panic (slice? (sha256 seed) u0 u16)) u16)))
    )
    (mod (buff-to-uint-be chunk) u3)
  )
)

;; outcome: u0 draw, u1 player wins, u2 player loses
(define-private (outcome
    (p uint)
    (h uint)
  )
  (mod (+ p (- u3 h)) u3)
)

(define-public (play (move uint))
  (let (
      (who tx-sender)
      (prev (default-to EMPTY (map-get? stats who)))
      (nonce (+ (get plays prev) u1))
      (house (house-move who nonce))
      (res (outcome move house))
      (won (is-eq res u1))
      (new-streak (if won
        (+ (get streak prev) u1)
        u0
      ))
      (new-best (if (> new-streak (get best-streak prev))
        new-streak
        (get best-streak prev)
      ))
    )
    (asserts! (< move u3) ERR-BAD-MOVE)
    (map-set stats who {
      plays: nonce,
      wins: (if (is-eq res u1)
        (+ (get wins prev) u1)
        (get wins prev)
      ),
      losses: (if (is-eq res u2)
        (+ (get losses prev) u1)
        (get losses prev)
      ),
      draws: (if (is-eq res u0)
        (+ (get draws prev) u1)
        (get draws prev)
      ),
      streak: new-streak,
      best-streak: new-best,
    })
    (var-set total-plays (+ (var-get total-plays) u1))
    (and (> new-best (var-get top-streak))
      (begin
        (var-set top-streak new-best)
        (var-set top-holder (some who))
        true
      )
    )
    (print {
      event: "play",
      player: who,
      move: move,
      house: house,
      outcome: res,
    })
    (ok {
      house: house,
      outcome: res,
      streak: new-streak,
    })
  )
)

(define-read-only (get-stats (who principal))
  (default-to EMPTY (map-get? stats who))
)

(define-read-only (get-total-plays)
  (var-get total-plays)
)

(define-read-only (get-top)
  {
    player: (var-get top-holder),
    streak: (var-get top-streak),
  }
)
