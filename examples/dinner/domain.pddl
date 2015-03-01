(define (domain birthday-dinner)
 (:requirements :strips)
 (:action cook
    :parameters (?x)
    :precondition (and (clean ?x))
    :effect (and (dinner ?x)))
 (:action wrap
    :parameters (?x)
    :precondition (and (quiet ?x))
    :effect (and (present ?x)))
 (:action carry
    :parameters (?x)
    :precondition (and (garbage ?x))
    :effect (not (garbage ?x) not (clean ?x)))
 (:action dolly
    :parameters (?x)
    :precondition (and (garbage ?x))
    :effect (not (garbage ?x) not (quiet ?x)))
)