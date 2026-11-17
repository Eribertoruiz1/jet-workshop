/**
 * Every visible text of the flight page, in Spanish and English with the same
 * keys (decision 0003). Braces mark figures the code computes; no figure is
 * written inside a string (brief 006, check 8). Decimals use a point in both
 * languages.
 *
 * Lane A's string tables (apps/web/src/i18n/, on lane/lesson) were read as a
 * reference; unifying both is a Ticket (brief 006, Amendment 1, point 2).
 */

export type Lang = "es" | "en";

const es = {
  title: "Primer vuelo",
  back: "Volver al taller",
  langLabel: "Idioma",

  hangarTitle: "Prepara el avión",
  wingButton: "{sweep}°",
  wingButtonLabel: "Ala con {sweep}° de flecha",
  wingsNote: "Son las tres alas que la NACA midió en {year}.",
  wingSize: "Tamaño del ala: {S} m²",
  fuel: "Combustible: {f} kg",
  thrust: "Empuje del motor: {T} kN",
  takeoffWeight: "Peso al despegue: {W} kg",
  thrustToWeight: "Empuje entre peso: {tw}",
  takeoffSpeed: "Velocidad de despegue estimada: {v} km/h",
  hangarNote: "El motor y el peso son estimados. No se modelan la cola, la cabina ni el tren.",
  provisionalEngine: "Motor provisional: un empuje elegido que cae con la densidad del aire.",
  board: "Al avión",
  profileLabel: "El avión de perfil, a escala: {length} m de largo, {span} m de envergadura.",

  speedLabel: "Velocidad",
  heightLabel: "Altura",
  fuelLabel: "Combustible",
  loadLabel: "Carga",
  runwayLabel: "Pista de llegada",
  speedValue: "{v} km/h · Mach {m}",
  heightValue: "{h} m",
  fuelValue: "{f} %",
  loadValue: "{g} g",
  runwayValue: "{d} km",
  statusLabel: "Estado",
  statusLift: "Sustentación",
  statusDrag: "Resistencia",
  statusThrust: "Empuje",
  statusWeight: "Peso",
  validated: "Comprobado con medidas",
  estimated: "Estimado",
  noData: "Sin datos",

  nearStall: "Cerca de la pérdida",
  wingLimit: "Límite del ala",
  engineLimit: "Límite del motor: {limit}",

  forceLift: "sustentación",
  forceWeight: "peso",
  forceThrust: "empuje",
  forceDrag: "resistencia",
  forceSum: "suma",
  scaleBar: "{d} m",

  throttle: "Gas",
  pitch: "Cabeceo",
  pitchHint: "Arrastra hacia abajo para subir el morro",
  pause: "Pausa",
  resume: "Seguir",
  paused: "En pausa",
  keys: "Teclado: W y S, gas; flecha abajo sube el morro, flecha arriba lo baja; P, pausa.",
  sceneLabel: "Vuelo de perfil: el avión, el suelo y las fuerzas a escala.",

  reportEngine: "Motor provisional",
  titleLanded: "Aterrizaje",
  titleNoTakeoff: "No despegó",
  titleStall: "Pérdida",
  titleWingBreak: "Rotura del ala",
  titleOutOfFuel: "Sin combustible",
  titleEngine: "Fallo de motor",
  titleHardLanding: "Aterrizaje duro",
  titleCrash: "Choque",
  landed: "Aterrizaste. Velocidad máxima: Mach {m}. Te quedó un {f} % de combustible.",
  noCross: "No cruzó la velocidad del sonido: a Mach {m} la resistencia igualó al empuje.",
  noCrossCould: "No pasó de Mach {m}. Con todo el gas podía: a esa altura la resistencia iguala al empuje a Mach {meq}.",
  noCrossPlain: "No cruzó la velocidad del sonido.",
  noTakeoff: "No despegó. Al final de la pista iba a {v} km/h y necesitaba {vr} km/h para que el ala sostuviera el peso.",
  stall: "Entró en pérdida a {v} km/h. A esa altura, este ala no sostiene {w} kg por debajo de {vs} km/h.",
  wingBreak: "El ala se rompió a {g} g. Su límite era {gl} g.",
  outOfFuel: "Se quedó sin combustible a {d} km de la pista.",
  engineFailure: "El motor falló: {cause}.",
  hardLanding: "Tocó el suelo bajando a {vz} m/s. El tren aguanta {vl} m/s.",
  crash: "Chocó con el suelo a {v} km/h.",
  crashOffRunway: "Fuera de la pista, a {d} km de ella.",
  crashNoseLow: "Tocó la pista con el morro {a}° por debajo del horizonte.",
  figureTopSpeed: "Velocidad máxima",
  figureTopHeight: "Altura máxima",
  figureTime: "Tiempo en el aire",
  figureMach: "Mach {m}",
  figureMetres: "{h} m",
  figureSeconds: "{t} s",
  again: "Repetir",
  toHangar: "Volver al hangar",
  dataError: "No se pudieron leer los datos de la NACA: {error}",
} as const;

export type StringKey = keyof typeof es;

const en: Record<StringKey, string> = {
  title: "First flight",
  back: "Back to the workshop",
  langLabel: "Language",

  hangarTitle: "Set up the aircraft",
  wingButton: "{sweep}°",
  wingButtonLabel: "Wing swept {sweep}°",
  wingsNote: "These are the three wings NACA measured in {year}.",
  wingSize: "Wing size: {S} m²",
  fuel: "Fuel: {f} kg",
  thrust: "Engine thrust: {T} kN",
  takeoffWeight: "Take-off weight: {W} kg",
  thrustToWeight: "Thrust to weight: {tw}",
  takeoffSpeed: "Estimated take-off speed: {v} km/h",
  hangarNote: "The engine and the weight are estimates. The tail, the canopy and the landing gear are not modelled.",
  provisionalEngine: "Provisional engine: a chosen thrust that falls with air density.",
  board: "Board",
  profileLabel: "The aircraft in profile, to scale: {length} m long, {span} m span.",

  speedLabel: "Speed",
  heightLabel: "Height",
  fuelLabel: "Fuel",
  loadLabel: "Load",
  runwayLabel: "Landing runway",
  speedValue: "{v} km/h · Mach {m}",
  heightValue: "{h} m",
  fuelValue: "{f} %",
  loadValue: "{g} g",
  runwayValue: "{d} km",
  statusLabel: "Status",
  statusLift: "Lift",
  statusDrag: "Drag",
  statusThrust: "Thrust",
  statusWeight: "Weight",
  validated: "Checked against measurements",
  estimated: "Estimated",
  noData: "No data",

  nearStall: "Near the stall",
  wingLimit: "Wing limit",
  engineLimit: "Engine limit: {limit}",

  forceLift: "lift",
  forceWeight: "weight",
  forceThrust: "thrust",
  forceDrag: "drag",
  forceSum: "sum",
  scaleBar: "{d} m",

  throttle: "Throttle",
  pitch: "Pitch",
  pitchHint: "Drag down to raise the nose",
  pause: "Pause",
  resume: "Resume",
  paused: "Paused",
  keys: "Keyboard: W and S, throttle; down arrow raises the nose, up arrow lowers it; P, pause.",
  sceneLabel: "Flight in profile: the aircraft, the ground and the forces to scale.",

  reportEngine: "Provisional engine",
  titleLanded: "Landing",
  titleNoTakeoff: "No take-off",
  titleStall: "Stall",
  titleWingBreak: "Wing failure",
  titleOutOfFuel: "Out of fuel",
  titleEngine: "Engine failure",
  titleHardLanding: "Hard landing",
  titleCrash: "Crash",
  landed: "You landed. Top speed: Mach {m}. You had {f} % of the fuel left.",
  noCross: "It did not go supersonic: at Mach {m} drag equalled thrust.",
  noCrossCould: "It did not pass Mach {m}. At full throttle it could have: at that height drag equals thrust at Mach {meq}.",
  noCrossPlain: "It did not go supersonic.",
  noTakeoff: "It did not take off. At the end of the runway it was doing {v} km/h and needed {vr} km/h for the wing to carry the weight.",
  stall: "It stalled at {v} km/h. At that height this wing cannot carry {w} kg below {vs} km/h.",
  wingBreak: "The wing broke at {g} g. Its limit was {gl} g.",
  outOfFuel: "It ran out of fuel {d} km from the runway.",
  engineFailure: "The engine failed: {cause}.",
  hardLanding: "It touched down sinking at {vz} m/s. The gear takes {vl} m/s.",
  crash: "It hit the ground at {v} km/h.",
  crashOffRunway: "Off the runway, {d} km from it.",
  crashNoseLow: "It touched the runway with the nose {a}° below the horizon.",
  figureTopSpeed: "Top speed",
  figureTopHeight: "Greatest height",
  figureTime: "Time in the air",
  figureMach: "Mach {m}",
  figureMetres: "{h} m",
  figureSeconds: "{t} s",
  again: "Fly again",
  toHangar: "Back to the hangar",
  dataError: "The NACA data could not be read: {error}",
};

export const STRINGS: Record<Lang, Record<StringKey, string>> = { es, en };

/** Spanish if the browser's language starts with "es", English otherwise (decision 0003). */
export function initialLang(navigatorLanguage: string | undefined): Lang {
  return navigatorLanguage?.toLowerCase().startsWith("es") ? "es" : "en";
}

/** The string for a key with its figures filled in. A missing figure is an error, not a blank. */
export function t(lang: Lang, key: StringKey, values: Record<string, string> = {}): string {
  return STRINGS[lang][key].replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = values[name];
    if (v === undefined) throw new Error(`string ${key}: no value for {${name}}`);
    return v;
  });
}
