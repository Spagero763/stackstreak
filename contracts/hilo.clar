;; HiLo - Higher or Lower
;; Single-player. Start a round to reveal a number (1-100), then call whether the
;; next number is higher or lower. Correct calls extend your run; a wrong call
;; ends it. Ties count as correct. Every action is one transaction.

(define-constant ERR-NOT-ACTIVE (err u500))

(define-constant EMPTY {
  current: u0,
  run: u0,
  best-run: u0,
  plays: u0,
  active: false,
})

(define-data-var total-rounds uint u0)
(define-data-var top-run uint u0)
(define-data-var top-holder (optional principal) none)

(define-map states
  principal
  {
    current: uint,
    run: uint,
    best-run: uint,
    plays: uint,
    active: bool,
  }
)

(define-private (roll-100
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
    (+ u1 (mod (buff-to-uint-be chunk) u100))
  )
)

;; Start (or restart) a run: reveals a fresh current number.
(define-public (start)
  (let (
      (who tx-sender)
      (prev (default-to EMPTY (map-get? states who)))
      (nonce (+ (get plays prev) u1))
      (cur (roll-100 who nonce))
    )
    (map-set states who (merge prev {
      current: cur,
      run: u0,
      plays: nonce,
      active: true,
    }))
    (var-set total-rounds (+ (var-get total-rounds) u1))
    (print {
      event: "start",
      player: who,
      current: cur,
    })
    (ok cur)
  )
)

;; Call the next number higher (true) or lower (false) than current.
(define-public (guess (higher bool))
  (let (
      (who tx-sender)
      (prev (default-to EMPTY (map-get? states who)))
    )
    (asserts! (get active prev) ERR-NOT-ACTIVE)
    (let (
        (nonce (+ (get plays prev) u1))
        (cur (get current prev))
        (next (roll-100 who nonce))
        (correct (if (is-eq next cur)
          true
          (if higher
            (> next cur)
            (< next cur)
          )
        ))
        (new-run (if correct
          (+ (get run prev) u1)
          u0
        ))
        (new-best (if (> new-run (get best-run prev))
          new-run
          (get best-run prev)
        ))
      )
      (map-set states who {
        current: next,
        run: new-run,
        best-run: new-best,
        plays: nonce,
        active: correct,
      })
      (var-set total-rounds (+ (var-get total-rounds) u1))
      (and (> new-best (var-get top-run))
        (begin
          (var-set top-run new-best)
          (var-set top-holder (some who))
          true
        )
      )
      (print {
        event: "guess",
        player: who,
        higher: higher,
        prev: cur,
        next: next,
        correct: correct,
        run: new-run,
      })
      (ok {
        next: next,
        correct: correct,
        run: new-run,
        active: correct,
      })
    )
  )
)

(define-read-only (get-state (who principal))
  (default-to EMPTY (map-get? states who))
)

(define-read-only (get-total-rounds)
  (var-get total-rounds)
)

(define-read-only (get-top)
  {
    player: (var-get top-holder),
    run: (var-get top-run),
  }
)
