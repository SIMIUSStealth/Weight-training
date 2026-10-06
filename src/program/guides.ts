// What each gym exercise is (one line) and where to see the form done right.
// Links go to established exercise libraries — ACE Fitness (American Council
// on Exercise) first, then ExRx.net, NASM and Catalyst Athletics where ACE has
// no matching page. Kept apart from exercises.ts so the routine data stays
// readable. Moves without a trusted page (the less common kettlebell circuit
// moves, diamond push-up, Zottman curl, and the leg press, pec deck and
// abdominal machine, which vary a lot by brand) carry only the description.

export interface ExerciseGuide {
  /** One-line "what is it": the movement and what it trains. */
  about: string
  /** A form guide from a reputable exercise library. */
  url?: string
  /** Who publishes the guide, shown on the link. */
  source?: string
}

const ACE = 'ACE Fitness'
const ace = (path: string) =>
  `https://www.acefitness.org/resources/everyone/exercise-library/${path}/`
const EXRX = 'ExRx.net'
const exrx = (path: string) => `https://exrx.net/WeightExercises/${path}`

export const GUIDES: Record<string, ExerciseGuide> = {
  // ----- Squat, pull, bench -----
  'pull-up': {
    about: 'Hang from a bar and pull your chin over it. The main vertical pull: lats, upper back and biceps.',
    url: ace('191/pull-ups'),
    source: ACE,
  },
  'back-squat': {
    about: 'Barbell on your upper back, sit down and stand back up. The big leg builder: quads, glutes, adductors.',
    url: ace('11/back-squat'),
    source: ACE,
  },
  'goblet-squat': {
    about: 'A squat holding one dumbbell at your chest. Easier to learn than the barbell squat: quads and glutes.',
    url: ace('362/goblet-squat'),
    source: ACE,
  },
  'bench-press': {
    about: 'Lying on a bench, lower a barbell to your chest and press it up. Chest, front shoulders, triceps.',
    url: ace('5/chest-press'),
    source: ACE,
  },
  'db-bench-press': {
    about: 'The bench press with two dumbbells: a deeper stretch and each arm works on its own. Chest, shoulders, triceps.',
    url: ace('19/chest-press'),
    source: ACE,
  },
  'incline-db-press': {
    about: 'Dumbbell press on a bench tilted up 30–45°. Biases the upper chest and front shoulders.',
    url: ace('25/incline-chest-press'),
    source: ACE,
  },
  'decline-db-press': {
    about: 'Dumbbell press on a bench tilted slightly down. Biases the lower chest.',
    url: exrx('PectoralSternal/DBDeclineBenchPress'),
    source: EXRX,
  },

  // ----- Dips and hinges -----
  'bench-dip': {
    about: 'Hands on a bench behind you, lower and press yourself back up. Mostly triceps, plus chest and front shoulders.',
    url: 'https://www.nasm.org/resource-center/exercise-library/bench-dips',
    source: 'NASM',
  },
  'machine-dip': {
    about: 'Seated machine where you press handles down beside you. A dip without lifting your bodyweight: triceps and chest.',
    url: exrx('Triceps/LVTriDip'),
    source: EXRX,
  },
  dip: {
    about: 'Lower and press yourself up between parallel bars. The assisted machine takes off part of your weight. Chest, triceps, front shoulders.',
    url: exrx('PectoralSternal/AsChestDip'),
    source: EXRX,
  },
  deadlift: {
    about: 'Lift a barbell from the floor to standing by driving the hips forward. The whole back of the body: glutes, hamstrings, back.',
    url: ace('6/deadlift'),
    source: ACE,
  },
  'barbell-rdl': {
    about: 'Romanian deadlift: from standing, hinge the bar down your thighs and back up. Hamstrings and glutes.',
    url: ace('317/romanian-deadlift'),
    source: ACE,
  },
  'hip-thrust': {
    about: 'Upper back on a bench, drive a barbell up with your hips. The most direct glute exercise.',
    url: exrx('GluteusMaximus/BBHipThrust.html'),
    source: EXRX,
  },

  // ----- Rows and presses -----
  'cable-row': {
    about: 'Seated, pull a cable handle to your stomach. Mid-back, lats and rear shoulders: good for posture.',
    url: ace('48/seated-row'),
    source: ACE,
  },
  'machine-row': {
    about: 'Chest on a pad, row the handles back. The same muscles as the cable row with less to balance.',
    url: ace('168/seated-row'),
    source: ACE,
  },
  't-bar-row': {
    about: 'Bent over (or chest on a pad), row a plate-loaded bar to your chest. Thick mid-back and lats.',
    url: exrx('BackGeneral/LVCloseGripTBarRow'),
    source: EXRX,
  },
  'machine-chest-press': {
    about: 'Seated machine press straight forward. A guided bench press: chest, front shoulders, triceps.',
    url: ace('188/seated-chest-press'),
    source: ACE,
  },
  'shoulder-press': {
    about: 'Seated machine press overhead. Shoulders (mainly the front) and triceps.',
    url: ace('186/seated-shoulder-press'),
    source: ACE,
  },
  'push-up': {
    about: 'The classic floor press. Chest, shoulders and triceps, with your core holding a straight line.',
    url: ace('41/push-up'),
    source: ACE,
  },
  'diamond-push-up': {
    about: 'A push-up with your hands together under your chest. Shifts the work onto the triceps.',
  },

  // ----- Arms, chest, lats -----
  'pec-deck': {
    about: 'Seated machine where you sweep two handles together in front of your chest. Isolates the chest with a deep, safe stretch.',
  },
  'cable-pushdown': {
    about: 'Push a rope down from a high cable by straightening your elbows. Isolates the triceps.',
    url: ace('333/tricep-pressdown'),
    source: ACE,
  },
  'bar-pushdown': {
    about: 'The pushdown with a straight or V-bar: you can usually go a bit heavier. Triceps.',
    url: ace('185/triceps-pushdowns'),
    source: ACE,
  },
  'overhead-cable-extension': {
    about: 'Straighten your arms overhead against a cable behind you. Stretches and loads the long head of the triceps.',
    url: 'https://catalystathletics.com/exercise/817/Cable-Overhead-Tricep-Extension/',
    source: 'Catalyst Athletics',
  },
  'zottman-curl': {
    about: 'Curl up palms-up, turn palms-down at the top, lower slowly. Biceps on the way up, forearms on the way down.',
  },
  'biceps-curl': {
    about: 'Bend the elbows to lift dumbbells to your shoulders. Isolates the biceps.',
    url: ace('44/seated-biceps-curl'),
    source: ACE,
  },
  'low-to-high-cable-fly': {
    about: 'Sweep two low cable handles up and together in an arc. Upper chest, without the triceps taking over.',
    url: ace('163/standing-incline-cable-flyes'),
    source: ACE,
  },
  'high-to-low-cable-fly': {
    about: 'Sweep two high cable handles down and together. Lower chest.',
    url: ace('161/standing-decline-cable-flyes'),
    source: ACE,
  },
  'lat-pulldown': {
    about: 'Seated, pull an overhead bar down to your upper chest. Builds the lats (the V-shape) and is the stand-in for pull-ups.',
    url: ace('158/seated-lat-pulldown'),
    source: ACE,
  },
  'close-grip-lat-pulldown': {
    about: 'The pulldown with a close neutral (V) handle. Longer range for the lats, more biceps.',
    url: ace('158/seated-lat-pulldown'),
    source: ACE,
  },
  'wide-grip-lat-pulldown': {
    about: 'The pulldown with hands well outside the shoulders. Biases the upper lats and upper back.',
    url: ace('158/seated-lat-pulldown'),
    source: ACE,
  },

  // ----- Legs -----
  'leg-press': {
    about: 'Seated sled you press away with your legs. Heavy quad and glute work without loading your spine.',
  },
  'hamstring-curl': {
    about: 'Machine curl of your heels toward your glutes. Isolates the hamstrings.',
    url: ace('153/lying-hamstrings-curl'),
    source: ACE,
  },
  'leg-extension': {
    about: 'Seated machine where you straighten your knees against a pad. Isolates the quads.',
    url: ace('183/seated-leg-extension'),
    source: ACE,
  },
  'hanging-leg-raise': {
    about: 'Hanging from a bar, lift your legs up in front of you. Hip flexors and lower abs.',
    url: exrx('HipFlexors/BWHangingLegRaise'),
    source: EXRX,
  },
  'bulgarian-split-squat': {
    about: 'A single-leg squat with the back foot up on a bench. Quads and glutes, one leg at a time.',
    url: ace('366/bulgarian-split-squat'),
    source: ACE,
  },
  'machine-calf-raise': {
    about: 'Rise onto the balls of your feet against a machine load. Calves.',
    url: ace('294/calf-raise'),
    source: ACE,
  },

  // ----- Core -----
  'ab-machine': {
    about: 'Seated crunch machine with a weight stack. Loaded ab work you can progress like any lift.',
  },
  'ab-wheel-rollout': {
    about: 'Roll a wheel out in front of you and pull it back without your lower back sagging. Anti-extension core strength.',
    url: 'https://catalystathletics.com/exercise/135/Ab-Rollout/',
    source: 'Catalyst Athletics',
  },
  'pallof-press': {
    about: 'Standing side-on to a cable, press a handle straight out and resist being twisted. Anti-rotation core strength.',
    url: ace('332/standing-anti-rotation-press'),
    source: ACE,
  },
  'back-extension': {
    about: 'On a hyperextension bench, lower your torso and rise back to a straight line. Lower back, glutes, hamstrings.',
    url: exrx('ErectorSpinae/Wt45Hyperextension'),
    source: EXRX,
  },

  // ----- Kettlebell core -----
  'kb-plank-pull-through': {
    about: 'In a high plank, drag a kettlebell from side to side under your body. Resists twisting: core and shoulders.',
  },
  'kb-halo': {
    about: 'Circle a kettlebell around your head. Shoulder mobility with a braced core.',
    url: ace('394/halo'),
    source: ACE,
  },
  'kb-around-the-world': {
    about: 'Pass a kettlebell around your waist from hand to hand. Obliques and grip.',
  },
  'kb-shoveling': {
    about: 'Drive a kettlebell diagonally across your body like shovelling. Rotational core power.',
  },
  'kb-swing': {
    about: 'Hike a kettlebell between your legs and snap the hips to float it up. Explosive glutes and hamstrings; the arms just guide.',
    url: ace('391/swing'),
    source: ACE,
  },
  'kb-iron-trident': {
    about: 'A braced, controlled kettlebell core move, done the way you were coached.',
  },
  plank: {
    about: 'Hold a straight line on your forearms and toes. Whole-core bracing.',
    url: ace('32/front-plank'),
    source: ACE,
  },
  'kb-situp-to-stand': {
    about: 'From lying down with a kettlebell at your chest, sit up and stand up in one flow. Core and legs.',
  },
}

export function getGuide(exerciseId: string): ExerciseGuide | undefined {
  return GUIDES[exerciseId]
}
