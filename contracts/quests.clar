;; Daily Quests
;; Check in, play at least GOAL moves across any of the seven games, then
;; claim -- all in the same (Bitcoin-bucketed) day. The contract verifies
;; completion itself: check-in snapshots your aggregate play counters across
;; every game contract, and claim only succeeds if the live aggregate grew by
;; at least GOAL since the snapshot. Nothing is self-attested.
;; Claim on consecutive days to build a quest streak.

(define-constant GOAL u3)
;; Bitcoin produces ~144 blocks/day; day buckets match stackstreak's.
(define-constant BLOCKS-PER-DAY u144)

(define-constant ERR-ALREADY-CHECKED-IN (err u600))
(define-constant ERR-NOT-CHECKED-IN (err u601))
(define-constant ERR-ALREADY-CLAIMED (err u602))
(define-constant ERR-QUEST-INCOMPLETE (err u603))

(define-constant EMPTY-STATS {
  completed: u0,
  streak: u0,
  best-streak: u0,
  last-day: u0,
})

(define-data-var total-claims uint u0)
(define-data-var top-completed uint u0)
(define-data-var top-holder (optional principal) none)

;; Today's quest state per player.
(define-map progress
  principal
  {
    day: uint,
    start: uint,
    claimed: bool,
  }
)

;; Lifetime quest record per player.
(define-map stats
  principal
  {
    completed: uint,
    streak: uint,
    best-streak: uint,
    last-day: uint,
  }
)

(define-private (current-day)
  (/ burn-block-height BLOCKS-PER-DAY)
)

;; Aggregate lifetime plays across every game, read live from each contract.
;; Counters only ever grow, so a delta against a snapshot is tamper-proof.
(define-read-only (plays-of (who principal))
  (let (
      (ttt (contract-call? .tictactoe get-record who))
      (c4 (contract-call? .connectfour get-record who))
    )
    (+
      (get plays (contract-call? .stackstreak get-stats who))
      (get flips (contract-call? .coinflip get-stats who))
      (get plays (contract-call? .rps get-stats who))
      (get plays (contract-call? .hilo get-state who))
      (get spins (contract-call? .reels get-stats who))
      (get wins ttt) (get losses ttt) (get draws ttt)
      (get wins c4) (get losses c4) (get draws c4)
    )
  )
)

;; Start today's quest: snapshot your aggregate counter.
(define-public (check-in)
  (let (
      (who tx-sender)
      (today (current-day))
    )
    (asserts!
      (match (map-get? progress who)
        p (not (is-eq (get day p) today))
        true
      )
      ERR-ALREADY-CHECKED-IN
    )
    (map-set progress who {
      day: today,
      start: (plays-of who),
      claimed: false,
    })
    (print {
      event: "check-in",
      player: who,
      day: today,
      goal: GOAL,
    })
    (ok { day: today, goal: GOAL })
  )
)

;; Claim today's quest once you have made GOAL plays since checking in.
(define-public (claim)
  (let (
      (who tx-sender)
      (today (current-day))
      (p (unwrap! (map-get? progress who) ERR-NOT-CHECKED-IN))
      (done (- (plays-of who) (get start p)))
      (prev (default-to EMPTY-STATS (map-get? stats who)))
    )
    (asserts! (is-eq (get day p) today) ERR-NOT-CHECKED-IN)
    (asserts! (not (get claimed p)) ERR-ALREADY-CLAIMED)
    (asserts! (>= done GOAL) ERR-QUEST-INCOMPLETE)
    (let (
        (continues (and
          (> (get completed prev) u0)
          (> today u0)
          (is-eq (get last-day prev) (- today u1))
        ))
        (new-streak (if continues
          (+ (get streak prev) u1)
          u1
        ))
        (new-best (if (> new-streak (get best-streak prev))
          new-streak
          (get best-streak prev)
        ))
        (new-completed (+ (get completed prev) u1))
      )
      (map-set progress who (merge p { claimed: true }))
      (map-set stats who {
        completed: new-completed,
        streak: new-streak,
        best-streak: new-best,
        last-day: today,
      })
      (var-set total-claims (+ (var-get total-claims) u1))
      (and (> new-completed (var-get top-completed))
        (begin
          (var-set top-completed new-completed)
          (var-set top-holder (some who))
          true
        )
      )
      (print {
        event: "claim",
        player: who,
        day: today,
        plays: done,
        completed: new-completed,
        streak: new-streak,
      })
      (ok {
        completed: new-completed,
        streak: new-streak,
      })
    )
  )
)

;; Today's live progress for a player.
(define-read-only (get-progress (who principal))
  (let ((today (current-day)))
    (match (map-get? progress who)
      p (if (is-eq (get day p) today)
        {
          active: true,
          claimed: (get claimed p),
          done: (- (plays-of who) (get start p)),
          goal: GOAL,
          day: today,
        }
        { active: false, claimed: false, done: u0, goal: GOAL, day: today }
      )
      { active: false, claimed: false, done: u0, goal: GOAL, day: today }
    )
  )
)

(define-read-only (get-quest-stats (who principal))
  (default-to EMPTY-STATS (map-get? stats who))
)

(define-read-only (get-top)
  {
    player: (var-get top-holder),
    completed: (var-get top-completed),
  }
)

(define-read-only (get-total-claims)
  (var-get total-claims)
)
