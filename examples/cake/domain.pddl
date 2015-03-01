;; The "Have Cake and Eat it Too" Problem

(define (domain have-cake-and-eat-it-too)
 (:requirements :strips)
 (:action eat                                
     :parameters (?cake)
     :precondition (and (have ?cake))
     :effect (and (eaten ?cake) not (have ?cake)))
 (:action bake                                
     :parameters (?cake)
     :precondition (not (have ?cake))
     :effect (and (have ?cake))))
