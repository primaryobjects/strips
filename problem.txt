(define (problem random-pbl1)
  (:domain random-domain)
  (:init
     (S B B) (S C B) (S A C)
     (R B B) (R C B))
  (:goal (and (S A A))))