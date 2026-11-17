import { deriveSpecs } from '../../tools/lib/specs.js';

export const CLASS_JOBS = {
  scout: 'Explore · precision crossings · light deliveries',
  highway: 'Road speed · long deliveries · smooth driving',
  'heavy-duty': 'Loaded work · mixed terrain · reliable hauling',
  offroad: 'Deep bogs · technical climbs · traction challenges',
  heavy: 'Exceptional loads · crushing · controlled momentum',
};

// Real specifications rather than saturated 0–100 bars. Pull per gross tonne
// is a comparison aid, not a simulated acceleration or climbing guarantee.
export function fleetStats(car) {
  const s = deriveSpecs(car), gross = (car.physics.mass + car.physics.wheelMass * car.rig.axles.length) / 1000 + (car.physics.load?.massT ?? 0);
  const suspension = car.physics.suspension;
  return {
    'Power / weight': { value: s.powerKw / gross, unit: 'kW/t', digits: 1 },
    'Top speed': { value: s.topSpeedKmh, unit: 'km/h', digits: 0 },
    'Tyre diameter': { value: car.rig.radius * 2, unit: 'm', digits: 2 },
    'Suspension travel': { value: (suspension.travelUp + suspension.travelDown) * 100, unit: 'cm', digits: 0 },
    'Gross weight': { value: gross, unit: 't', digits: 1 },
    'Mud pull in low': { value: car.physics.mudPull ?? 1, unit: '×', digits: 2 },
  };
}

export function upgradePreview(car, tuned, knob) {
  const a = deriveSpecs(car), b = deriveSpecs(tuned), travel = c => Math.round((c.physics.suspension.travelUp + c.physics.suspension.travelDown) * 100);
  return {
    engine: `${a.powerKw} → ${b.powerKw} kW`,
    speed: `${a.topSpeedKmh} → ${b.topSpeedKmh} km/h`,
    suspension: `${travel(car)} → ${travel(tuned)} cm travel`,
    grip: `${(car.physics.tireGrip ?? 1).toFixed(2)} → ${(tuned.physics.tireGrip ?? 1).toFixed(2)}× tyre grip`,
  }[knob];
}
