;; CoinFlip
;; Single-player, provably-fair coin flip on Stacks.
;; Call heads (u0) or tails (u1); the contract flips using on-chain entropy.
;; Correct calls build a streak; one miss resets it. Every flip is one tx.

(define-constant ERR-BAD-GUESS (err u300))

(define-constant EMPTY {
  flips: u0,
  wins: u0,
  losses: u0,
  streak: u0,
  best-streak: u0,
})

(define-data-var total-flips uint u0)
(define-data-var top-streak uint u0)
(define-data-var top-holder (optional principal) none)

(define-map stats
  principal
  {
    flips: uint,
    wins: uint,
    losses: uint,
    streak: uint,
    best-streak: uint,
  }
)

(define-private (flip-result
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
    (mod (buff-to-uint-be chunk) u2)
  )
)

;; guess: u0 = heads, u1 = tails
(define-public (flip (guess uint))
  (let (
      (who tx-sender)
      (prev (default-to EMPTY (map-get? stats who)))
      (nonce (+ (get flips prev) u1))
      (result (flip-result who nonce))
      (won (is-eq guess result))
      (new-streak (if won
        (+ (get streak prev) u1)
        u0
      ))
      (new-best (if (> new-streak (get best-streak prev))
        new-streak
        (get best-streak prev)
      ))
    )
    (asserts! (< guess u2) ERR-BAD-GUESS)
    (map-set stats who {
      flips: nonce,
      wins: (if won
        (+ (get wins prev) u1)
        (get wins prev)
      ),
      losses: (if won
        (get losses prev)
        (+ (get losses prev) u1)
      ),
      streak: new-streak,
      best-streak: new-best,
    })
    (var-set total-flips (+ (var-get total-flips) u1))
    (and (> new-best (var-get top-streak))
      (begin
        (var-set top-streak new-best)
        (var-set top-holder (some who))
        true
      )
    )
    (print {
      event: "flip",
      player: who,
      guess: guess,
      result: result,
      won: won,
      streak: new-streak,
    })
    (ok {
      result: result,
      won: won,
      streak: new-streak,
    })
  )
)

(define-read-only (get-stats (who principal))
  (default-to EMPTY (map-get? stats who))
)

(define-read-only (get-total-flips)
  (var-get total-flips)
)

(define-read-only (get-top)
  {
    player: (var-get top-holder),
    streak: (var-get top-streak),
  }
)
