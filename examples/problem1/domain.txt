(define (domain random-domain)
  (:requirements :strips)
  (:action op1
    :parameters (?x1 ?x2 ?x3)
    :precondition (and (S ?x1 ?x2) (R ?x3 ?x1))
    :effect (and (S ?x2 ?x1) (S ?x1 ?x3) (not (R ?x3 ?x1))))
  (:action op2
    :parameters (?x1 ?x2 ?x3)
    :precondition (and (S ?x3 ?x1) (R ?x2 ?x2))
    :effect (and (S ?x1 ?x3) (not (S ?x3 ?x1)))))