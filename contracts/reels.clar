;; Lucky Reels
;; Single-player, provably-fair 3-reel slot machine on Stacks.
;; One `spin` is one transaction: the contract draws three symbols (u0..u5)
;; from on-chain entropy. Three-of-a-kind is a jackpot; any pair is a small
;; win; a win continues your streak, a blank spin resets it. No house edge,
;; no wagering -- just the draw and your record on chain.

(define-constant SYMBOLS u6) ;; six reel symbols, 0..5

(define-constant EMPTY {
  spins: u0,
  wins: u0,
  jackpots: u0,
  streak: u0,
  best-streak: u0,
})

(define-data-var total-spins uint u0)
(define-data-var top-jackpots uint u0)
(define-data-var top-holder (optional principal) none)

(define-map stats
  principal
  {
    spins: uint,
    wins: uint,
    jackpots: uint,
    streak: uint,
    best-streak: uint,
  }
)

;; Read a uint from a slice of the seed hash (mirrors the other games' entropy
;; helper: slice -> fixed-length buff -> big-endian uint).
(define-private (chunk
    (h (buff 32))
    (start uint)
    (end uint)
  )
  (buff-to-uint-be (unwrap-panic (as-max-len? (unwrap-panic (slice? h start end)) u16)))
)

;; Draw one reel symbol in [0, SYMBOLS) from a chunk of the hash.
(define-private (reel
    (h (buff 32))
    (start uint)
    (end uint)
  )
  (mod (chunk h start end) SYMBOLS)
)

;; Outcome tier: u2 jackpot (all three equal), u1 pair (any two equal), u0 none.
(define-private (tier-of
    (a uint)
    (b uint)
    (c uint)
  )
  (if (and (is-eq a b) (is-eq b c))
    u2
    (if (or (is-eq a b) (is-eq b c) (is-eq a c))
      u1
      u0
    )
  )
)

(define-public (spin)
  (let (
      (who tx-sender)
      (prev (default-to EMPTY (map-get? stats who)))
      (nonce (+ (get spins prev) u1))
      (seed (unwrap-panic (to-consensus-buff? {
        w: who,
        b: burn-block-height,
        s: stacks-block-height,
        n: nonce,
      })))
      (h (sha256 seed))
      (r1 (reel h u0 u8))
      (r2 (reel h u8 u16))
      (r3 (reel h u16 u24))
      (tier (tier-of r1 r2 r3))
      (won (> tier u0))
      (is-jackpot (is-eq tier u2))
      (new-jackpots (if is-jackpot
        (+ (get jackpots prev) u1)
        (get jackpots prev)
      ))
      (new-streak (if won
        (+ (get streak prev) u1)
        u0
      ))
      (new-best (if (> new-streak (get best-streak prev))
        new-streak
        (get best-streak prev)
      ))
    )
    (map-set stats who {
      spins: nonce,
      wins: (if won
        (+ (get wins prev) u1)
        (get wins prev)
      ),
      jackpots: new-jackpots,
      streak: new-streak,
      best-streak: new-best,
    })
    (var-set total-spins (+ (var-get total-spins) u1))
    ;; Champion = most jackpots landed.
    (and (> new-jackpots (var-get top-jackpots))
      (begin
        (var-set top-jackpots new-jackpots)
        (var-set top-holder (some who))
        true
      )
    )
    (print {
      event: "spin",
      player: who,
      r1: r1,
      r2: r2,
      r3: r3,
      tier: tier,
      streak: new-streak,
    })
    (ok {
      reels: (list r1 r2 r3),
      tier: tier,
      streak: new-streak,
    })
  )
)

(define-read-only (get-stats (who principal))
  (default-to EMPTY (map-get? stats who))
)

(define-read-only (get-total-spins)
  (var-get total-spins)
)

(define-read-only (get-top)
  {
    player: (var-get top-holder),
    jackpots: (var-get top-jackpots),
  }
)
