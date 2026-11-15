// Stretch & easy strength — a small library of low-effort moves to pick from.
// Nothing here is tracked or progressed: it's inspiration, with one worked
// example per move (how, how much) and a link to see it done.
//
// The first routine is for a sore back of the knee (the "knieholte"): the calf
// and hamstring both cross it, so it is eased by gentle length in those two
// and easy strength around the joint — never by forcing the knee straight.

export interface Move {
  id: string
  name: string
  /** What it reaches, in plain words. */
  target: string
  /** How much: "2 × 30 s each side", "10 slow reps". */
  dose: string
  /** How to do it — two or three short sentences. */
  how: string
  /** What it should (and shouldn't) feel like, where that matters. */
  feel?: string
  /** What to look up for a video of it (defaults to the name). */
  search?: string
}

export interface Routine {
  id: string
  /** Short label for the picker. */
  short: string
  name: string
  /** One line on what it's for and when to do it. */
  about: string
  /** Rough time for the whole thing. */
  minutes: number
  /** What you need ("a wall", "a chair") — nothing, if omitted. */
  kit?: string
  /** A caution shown with the routine. */
  caution?: string
  moves: Move[]
}

export const ROUTINES: readonly Routine[] = [
  {
    id: 'knee-back',
    short: 'Back of knee',
    name: 'Sore back of the knee',
    about:
      'Gentle length for the calf and hamstring — the two muscles that cross the back of the knee — plus easy movement for the joint. Once or twice a day, never into pain.',
    minutes: 8,
    kit: 'A wall and a towel or belt',
    caution:
      'Keep every stretch at a mild pull (3 out of 10) and don’t force the knee straight. A swollen, hot or tender calf, a knee that locks or gives way, or pain that keeps getting worse is one for a physio or your GP, not for stretching.',
    moves: [
      {
        id: 'calf-straight',
        name: 'Wall calf stretch, knee straight',
        target: 'Upper calf (gastrocnemius)',
        dose: '2 × 30 s each side',
        how: 'Hands on a wall, sore leg back with the heel down and toes pointing forward. Keep that knee straight but not locked and lean your hips toward the wall.',
        feel: 'A pull high in the calf — not a pinch behind the knee. If it pinches, bend the knee a touch.',
        search: 'gastrocnemius wall calf stretch',
      },
      {
        id: 'calf-bent',
        name: 'Wall calf stretch, knee bent',
        target: 'Lower calf (soleus)',
        dose: '2 × 30 s each side',
        how: 'Same position, but step the back foot in a little and bend that knee while the heel stays on the floor. Sink down rather than forward.',
        feel: 'Lower and deeper than the first one, near the Achilles.',
        search: 'soleus calf stretch bent knee',
      },
      {
        id: 'hamstring-towel',
        name: 'Lying hamstring stretch with a towel',
        target: 'Back of the thigh',
        dose: '2 × 30 s each side',
        how: 'On your back, loop a towel around one foot and lift the leg. Keep the knee slightly bent and draw the leg toward you until the back of the thigh pulls; the other leg stays flat.',
        feel: 'Mid-thigh. If you feel it behind the knee, bend the knee more — length in the muscle is the aim, not a straight leg.',
        search: 'supine hamstring stretch with towel',
      },
      {
        id: 'nerve-glide',
        name: 'Seated nerve glide',
        target: 'The nerve that runs down the back of the leg',
        dose: '10 slow reps each side',
        how: 'Sit tall on a chair. Straighten one knee while you look up, then bend it back while you tuck your chin. Smooth and slow, like flossing — no holding at the end.',
        feel: 'A light tension that comes and goes. Tingling or a sharp pull means make the movement smaller.',
        search: 'sciatic nerve glide seated slider',
      },
      {
        id: 'heel-slide',
        name: 'Heel slides',
        target: 'Easy knee bending and straightening',
        dose: '15 slow reps each side',
        how: 'On your back or sitting on the floor, slide your heel toward your bottom as far as is comfortable, then slide it back out until the leg rests straight.',
        feel: 'Just movement. Stop short of any pinch at the back of the knee.',
        search: 'heel slides knee exercise',
      },
    ],
  },
  {
    id: 'easy-strength',
    short: 'Easy strength',
    name: 'Easy strength, no kit',
    about:
      'Ten minutes on the floor to keep the hips, thighs and calves working — the muscles that take load off the knee. Slow and controlled; stop each set while it still feels easy.',
    minutes: 10,
    kit: 'A chair',
    moves: [
      {
        id: 'glute-bridge',
        name: 'Glute bridge',
        target: 'Glutes and hamstrings',
        dose: '2 × 12, pause 2 s at the top',
        how: 'On your back, knees bent, feet hip-width. Squeeze your glutes and lift your hips until shoulders, hips and knees line up, then lower slowly.',
        feel: 'In the glutes. If the hamstrings cramp, bring your feet closer.',
      },
      {
        id: 'heel-dig-hold',
        name: 'Heel-dig bridge hold',
        target: 'Hamstrings, without moving the knee',
        dose: '3 × 20 s',
        how: 'Bridge position with your feet a little further away and toes lifted, so you rest on your heels. Lift the hips a few centimetres and hold, pulling the heels gently toward you.',
        feel: 'A steady effort in the back of the thighs. Should feel like work, not pain.',
        search: 'isometric hamstring bridge hold',
      },
      {
        id: 'sit-to-stand',
        name: 'Sit to stand',
        target: 'Thighs and glutes',
        dose: '2 × 10',
        how: 'From a chair, feet under your knees, stand up without using your hands and sit back down slowly — three seconds on the way down.',
        feel: 'Thighs working. Use a higher seat if the knee complains at the bottom.',
        search: 'sit to stand exercise chair',
      },
      {
        id: 'calf-raise',
        name: 'Slow calf raises',
        target: 'Calves',
        dose: '2 × 15',
        how: 'Hold a wall or chair for balance. Rise onto your toes over two seconds, pause, and lower over three. Both legs together.',
        feel: 'A warm calf by the end. Move to one leg at a time when two is too easy.',
        search: 'standing calf raise slow',
      },
      {
        id: 'quad-set',
        name: 'Quad squeeze',
        target: 'Front of the thigh',
        dose: '10 × 5 s each side',
        how: 'Sit with the leg out straight and a rolled towel under the knee. Tighten the thigh to press the knee gently into the towel, hold, relax.',
        feel: 'The muscle above the kneecap hardening. No pain behind the knee.',
        search: 'quad set exercise towel',
      },
      {
        id: 'side-leg-raise',
        name: 'Side-lying leg raise',
        target: 'Outer hip',
        dose: '2 × 12 each side',
        how: 'Lie on your side, bottom knee bent, top leg straight and slightly behind you. Lift the top leg to about hip height with the toes pointing forward, and lower slowly.',
        feel: 'The side of the hip, not the front of the thigh.',
        search: 'side lying hip abduction leg raise',
      },
    ],
  },
  {
    id: 'hips-legs',
    short: 'Hips & legs',
    name: 'Hips and legs',
    about:
      'For stiff hips after sitting or a leg day. Hold each stretch still, breathe out as you settle in, and never bounce.',
    minutes: 7,
    moves: [
      {
        id: 'hip-flexor',
        name: 'Half-kneeling hip flexor stretch',
        target: 'Front of the hip',
        dose: '2 × 30 s each side',
        how: 'Kneel on one knee, other foot in front. Tuck your tailbone under and squeeze the glute on the kneeling side, then ease your hips forward.',
        feel: 'The front of the hip of the kneeling leg. Put a cushion under the knee.',
      },
      {
        id: 'figure-four',
        name: 'Figure-four glute stretch',
        target: 'Glutes and deep hip',
        dose: '2 × 30 s each side',
        how: 'On your back, cross one ankle over the opposite knee. Pull the uncrossed thigh toward your chest until the crossed side’s buttock stretches.',
        search: 'supine figure 4 glute stretch',
      },
      {
        id: 'quad-stretch',
        name: 'Side-lying quad stretch',
        target: 'Front of the thigh',
        dose: '2 × 30 s each side',
        how: 'Lie on your side and pull the top heel toward your bottom, knees together, hips pushed slightly forward.',
        feel: 'Front of the thigh. Skip it if bending the knee that far hurts.',
      },
      {
        id: 'adductor-rock',
        name: 'Adductor rock-back',
        target: 'Inner thigh',
        dose: '10 slow reps each side',
        how: 'On hands and knees, stretch one leg straight out to the side with the foot flat. Rock your hips back toward your heel and forward again.',
        search: 'adductor rock back stretch',
      },
      {
        id: 'ninety-ninety',
        name: '90/90 hip switches',
        target: 'Hip rotation, both ways',
        dose: '8 slow switches',
        how: 'Sit with both knees bent to 90°, one leg in front and one to the side. Keeping your feet planted, roll both knees over to the other side.',
        feel: 'Hips opening. Lean back on your hands if it’s tight.',
        search: '90 90 hip switch mobility',
      },
    ],
  },
  {
    id: 'upper-body',
    short: 'Back & shoulders',
    name: 'Back and shoulders',
    about:
      'A desk reset, or a cool-down after pressing and pulling. Five moves, about five minutes.',
    minutes: 5,
    kit: 'A doorway',
    moves: [
      {
        id: 'cat-cow',
        name: 'Cat–cow',
        target: 'The whole spine',
        dose: '10 slow reps',
        how: 'On hands and knees, round your back up toward the ceiling and tuck your chin, then let your chest sink and look forward. Move with your breath.',
      },
      {
        id: 'open-book',
        name: 'Open book',
        target: 'Upper-back rotation',
        dose: '8 each side',
        how: 'Lie on your side with knees bent and stacked, arms straight out in front. Sweep the top arm up and over to the floor behind you, following it with your eyes; knees stay together.',
        search: 'open book thoracic rotation stretch',
      },
      {
        id: 'doorway-chest',
        name: 'Doorway chest stretch',
        target: 'Chest and front of the shoulders',
        dose: '2 × 30 s',
        how: 'Forearms on the door frame, elbows at shoulder height. Step one foot through and lean your chest forward.',
        feel: 'Across the chest. Lower the elbows if the shoulder pinches.',
      },
      {
        id: 'childs-pose',
        name: 'Child’s pose with a side reach',
        target: 'Lats and lower back',
        dose: '30 s centre, 20 s each side',
        how: 'Kneel, sit back on your heels and walk your hands forward. Then walk both hands to one side to stretch the opposite flank.',
        search: 'childs pose lat stretch side reach',
      },
      {
        id: 'upper-trap',
        name: 'Upper-trap neck stretch',
        target: 'Side of the neck',
        dose: '2 × 20 s each side',
        how: 'Sit tall and hold the chair seat with one hand. Tilt your head away from that side, ear toward the opposite shoulder; add light pressure with the free hand if you like.',
        feel: 'A gentle pull from neck to shoulder — handy after shrugs.',
        search: 'upper trapezius neck stretch seated',
      },
    ],
  },
]

/** A video search for the move — always there, and it shows several ways to do it. */
export function exampleUrl(move: Move): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(move.search ?? move.name)}`
}
