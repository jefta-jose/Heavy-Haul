import { deriveSpecs } from '../../tools/lib/specs.js';

// What the next upgrade step changes, in real numbers, for the Upgrades card.
export function upgradePreview(car, tuned, knob) {
  const a = deriveSpecs(car), b = deriveSpecs(tuned), travel = c => Math.round((c.physics.suspension.travelUp + c.physics.suspension.travelDown) * 100);
  return {
    engine: `${a.powerKw} → ${b.powerKw} kW`,
    speed: `${a.topSpeedKmh} → ${b.topSpeedKmh} km/h`,
    suspension: `${travel(car)} → ${travel(tuned)} cm travel`,
    grip: `${(car.physics.tireGrip ?? 1).toFixed(2)} → ${(tuned.physics.tireGrip ?? 1).toFixed(2)}× tyre grip`,
  }[knob];
}
