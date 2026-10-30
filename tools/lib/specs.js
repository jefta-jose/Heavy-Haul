// The spec numbers of a playable car, worked out from what its car.json actually drives with.
// content.js writes them over the car's roster entry (cars.json) every time content loads, so the
// garage card and the physics never disagree. Planned cars keep their authored roster numbers.
import { wheelRadius } from '../../src/physics/vehicle.js';

const round = (v, d = 0) => Math.round(v * 10 ** d) / 10 ** d;

export function deriveSpecs(car) {
  const d = car.drivetrain, curve = d.torqueCurve.map(([rpm, t]) => [rpm, t * d.torqueScale]);
  // top speed: the governed engine speed through high gear, on the rearmost driven axle's tires
  const driven = d.drivenAxles ?? car.rig.axles.map((_, i) => i);
  const R = wheelRadius(car.rig, driven.at(-1));
  const specs = {
    massT: round(car.physics.mass / 1000, 1),
    powerKw: round(Math.max(...curve.map(([rpm, t]) => t * rpm * 2 * Math.PI / 60 / 1000))),
    torqueNm: round(Math.max(...curve.map(([, t]) => t))),
    topSpeedKmh: round(d.governedRpm / d.gears.H * 2 * Math.PI / 60 * R * 3.6),
    fuelL: d.fuelLitres ?? 100,
    tireDiameterM: round(car.rig.radius * 2, 2),
    lengthM: round(car.physics.size[0], 1),   // the whole rig as drawn, trailer included
  };
  if (car.physics.load) specs.loadMassT = car.physics.load.massT;
  return specs;
}
