(define (problem fireball)
   (:domain magic-world)

   (:objects
      npc - player
      ogre dragon - monster
      town field river cave - location
      box1 box2 - chest
      reddust browndust - element
   )

   (:init
      (border town field)
      (border field town)
      (border field river)
      (border river field)
      (border river cave)
      (border cave river)

      (at npc town)
      (at ogre river)
      (at dragon cave)
      (guarded river)
      (guarded cave)

      (at box1 river)
      (at box2 cave)

      (fire reddust)
      (in reddust box1)

      (earth browndust)
      (in browndust box2)
   )

   (:goal (and (has-fireball npc)))
)