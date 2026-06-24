;; FlipBet -- a provably-fair coin-flip wager against the house pot.
;;
;; Stake WAGER microSTX and call heads (u0) or tails (u1). The contract flips
;; using on-chain entropy. A correct call pays 2x your stake straight to your
;; wallet (your stake back + an equal amount from the pot); a wrong call leaves
;; your stake in the pot.
;;
;; ZERO HOUSE EDGE: the flip is a fair 50/50, so over time the pot is
;; break-even in expectation -- the house never profits, it only absorbs
;; variance. The pot is seeded by the owner via `fund`, who can `withdraw` it.
;; Every bet is one transaction.

(define-constant WAGER u1000) ;; microSTX staked per bet (0.001 STX)

(define-constant ERR-BAD-GUESS (err u700))
(define-constant ERR-POT-TOO-LOW (err u701))
(define-constant ERR-NOT-OWNER (err u702))

(define-constant EMPTY {
  bets: u0,
  wins: u0,
  losses: u0,
  staked: u0,
  won: u0,
  streak: u0,
  best-streak: u0,
})

(define-data-var owner principal tx-sender)
(define-data-var total-bets uint u0)
(define-data-var top-wins uint u0)
(define-data-var top-holder (optional principal) none)

(define-map stats
  principal
  {
    bets: uint,
    wins: uint,
    losses: uint,
    staked: uint, ;; lifetime microSTX staked
    won: uint, ;; lifetime microSTX paid out to this player
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

(define-read-only (get-pot)
  (stx-get-balance (as-contract tx-sender))
)

;; Seed the pot. Anyone may add to it (the owner normally funds it).
(define-public (fund (amount uint))
  (stx-transfer? amount tx-sender (as-contract tx-sender))
)

;; Owner pulls STX back out of the pot.
(define-public (withdraw (amount uint))
  (begin
    (asserts! (is-eq tx-sender (var-get owner)) ERR-NOT-OWNER)
    (let ((recipient (var-get owner)))
      (as-contract (stx-transfer? amount tx-sender recipient))
    )
  )
)

;; guess: u0 = heads, u1 = tails.
(define-public (bet (guess uint))
  (let (
      (who tx-sender)
      (prev (default-to EMPTY (map-get? stats who)))
      (nonce (+ (get bets prev) u1))
      (result (flip-result who nonce))
      (won (is-eq guess result))
      (payout (* u2 WAGER))
    )
    (asserts! (< guess u2) ERR-BAD-GUESS)
    ;; The pot must be able to cover the net outflow of a win (one WAGER on top
    ;; of the stake we're about to receive).
    (asserts! (>= (get-pot) WAGER) ERR-POT-TOO-LOW)
    ;; Take the stake into the pot.
    (try! (stx-transfer? WAGER who (as-contract tx-sender)))
    ;; On a win, pay 2x back to the player from the pot.
    (and won (try! (as-contract (stx-transfer? payout tx-sender who))))
    (let (
        (new-streak (if won
          (+ (get streak prev) u1)
          u0
        ))
        (new-best (if (> new-streak (get best-streak prev))
          new-streak
          (get best-streak prev)
        ))
        (new-wins (if won
          (+ (get wins prev) u1)
          (get wins prev)
        ))
      )
      (map-set stats who {
        bets: nonce,
        wins: new-wins,
        losses: (if won
          (get losses prev)
          (+ (get losses prev) u1)
        ),
        staked: (+ (get staked prev) WAGER),
        won: (if won
          (+ (get won prev) payout)
          (get won prev)
        ),
        streak: new-streak,
        best-streak: new-best,
      })
      (var-set total-bets (+ (var-get total-bets) u1))
      (and (> new-wins (var-get top-wins))
        (begin
          (var-set top-wins new-wins)
          (var-set top-holder (some who))
          true
        )
      )
      (print {
        event: "bet",
        player: who,
        guess: guess,
        result: result,
        won: won,
        wager: WAGER,
        payout: (if won
          payout
          u0
        ),
        streak: new-streak,
      })
      (ok {
        result: result,
        won: won,
        payout: (if won
          payout
          u0
        ),
      })
    )
  )
)

(define-read-only (get-wager)
  WAGER
)

(define-read-only (get-stats (who principal))
  (default-to EMPTY (map-get? stats who))
)

(define-read-only (get-total-bets)
  (var-get total-bets)
)

(define-read-only (get-top)
  {
    player: (var-get top-holder),
    wins: (var-get top-wins),
  }
)
