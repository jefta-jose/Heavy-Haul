// Engine, gearbox and differentials. Each step this turns pedal input into a motor speed and a
// torque cap per wheel joint; the physics solver does the rest.
//
// Feel: a torque converter multiplies torque at launch (fading as the drive couples) and the
// commanded drive speed ramps quickly from rest then gently, so take-off is brisk and cruising
// is smooth. Open diffs are capped by the weakest tire's grip; locked diffs share spare torque.

export function createDrivetrain(cfg) {
  const curve = cfg.torqueCurve.map(([rpm, t]) => [rpm, t * cfg.torqueScale]);
  const ramp = cfg.driveRamp;
  function engineTorque(rpm) {
    if (rpm <= curve[0][0]) return curve[0][1];
    for (let i = 0; i < curve.length - 1; i++) if (rpm <= curve[i + 1][0]) { const t = (rpm - curve[i][0]) / (curve[i + 1][0] - curve[i][0]); return curve[i][1] + (curve[i + 1][1] - curve[i][1]) * t; }
    return 0;
  }

  // Returns everything the wheel loop needs for this step.
  function update({ ctl, st, wheels, joints, dt, gripOf }) {
    const ratio = cfg.gears[ctl.gear] || cfg.gears.H, dir = ctl.gear === 'R' ? 1 : -1;   // -1: clockwise = forward
    let omAvg = 0; for (const w of wheels) omAvg += w.getAngularVelocity(); omAvg /= wheels.length;
    const wheelRpm = Math.abs(omAvg) * ratio * 60 / (2 * Math.PI);
    // engine speed follows the wheels once moving; at a stall-speed launch the converter slips
    // a stopped engine runs down to rest; on the starter it turns at cranking speed
    const engTarget = st.engine === 'off' ? 0 : st.engine === 'cranking' ? 180 : Math.max(cfg.idleRpm + st.throttle * 600, wheelRpm);
    st.rpm += (engTarget - st.rpm) * Math.min(1, dt / cfg.inertia);
    const govOmega = cfg.governedRpm * 2 * Math.PI / 60 / ratio;
    st.rpmCmd = st.throttle > 0.01 ? Math.max(wheelRpm, Math.min(cfg.governedRpm, wheelRpm + ramp.maxSlipRpm, (st.rpmCmd || 0) + (ramp.base + ramp.launch * Math.max(0, 1 - wheelRpm / ramp.launchUntilRpm)) * dt * st.throttle)) : wheelRpm;
    const driveOmega = Math.min(govOmega, st.rpmCmd * 2 * Math.PI / 60 / ratio);
    const tEng = engineTorque(Math.max(st.rpm, 900)) * st.throttle * (1 + cfg.converterBoost * Math.max(0, 1 - wheelRpm / cfg.converterCoupleRpm));
    // 4x4 off: only the rear axles are driven. 4x4 on: the front axle is engaged too. A rig with
    // unpowered axles (a semi-trailer drawn as part of the truck) lists its driven ones.
    const powered = cfg.drivenAxles ?? wheels.map((_, i) => i);
    const driven = powered.filter(i => ctl.awd || i > 0);
    const perWheel = tEng * ratio * cfg.efficiency / driven.length;
    // Open differentials send equal torque to every driven wheel, so the wheel with the least grip
    // limits all of them. Grip comes from each tire's measured load (gripOf).
    let gripMin = Infinity;
    for (const i of driven) gripMin = Math.min(gripMin, gripOf(i) * cfg.openDiffGrip);
    const openCap = Math.max(perWheel * 0.12, gripMin);
    // Locked: torque a free-spinning wheel cannot use goes to the wheels that still grip.
    const caps = wheels.map(() => 0);
    if (ctl.diff) {
      // a wheel spinning clearly faster than the slowest locked wheel has lost the ground (hanging
      // over a ledge on a long rig, or up on a rock): its torque goes to the others
      let spare = 0, slowest = Infinity; const gripping = [];
      for (const i of driven) slowest = Math.min(slowest, Math.abs(wheels[i].getAngularVelocity()));
      for (const i of driven) {
        const om = Math.abs(wheels[i].getAngularVelocity()), used = Math.abs(joints[i].getMotorTorque(1 / dt));
        const free = Math.abs(om - govOmega) < govOmega * 0.08 || om - slowest > 1.2;
        if (free && used < perWheel * 0.9) spare += perWheel - used; else gripping.push(i);
        caps[i] = perWheel;
      }
      for (const i of gripping) caps[i] += spare / Math.max(1, gripping.length);
    } else for (const i of driven) caps[i] = Math.min(perWheel, openCap);
    st.diffLimited = !ctl.diff && st.throttle > 0.3 && openCap < perWheel * 0.8;
    st.power = tEng * Math.max(st.rpm, cfg.idleRpm) * 2 * Math.PI / 60 / 1000;   // kW
    return { ratio, dir, omAvg, govOmega, driveOmega, driven, caps };
  }

  return { update };
}
