(define (problem move-to-castle)
   (:domain magic-world)

   (:objects
      npc - player
      town field castle - location
   )

   (:init
      (border town field)
      (border field castle)

      (at npc town)
   )

   (:goal (and (at npc castle)))
)