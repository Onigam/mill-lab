import { G, RHO } from '@onigam/lab-kit/sim/hydraulic';

// Every constant of the model, one per line, with its status (docs/physics.md uses the same words):
//   REPORTED   stated in a source we read (the source is named);
//   DERIVED    computed from reported figures (the computation is in physics.md);
//   ESTIMATE   the sources we read are silent: a guess with its reasoning;
//   CALIBRATED an estimate chosen so that the model retrieves a reported figure (there is none: C_LEAK is an estimate).
// Nothing here is a tuned output: the powers and efficiencies of the lab are results of the equations that use these numbers.

export { G, RHO };

// ------------------------------------------------------------------------------------------------ the screw: design rules

/** Number of threads. REPORTED: the video shows three (K8); also the usual number (Simmons & Lubitz 2024). */
export const BLADES = 3;
/** Inner / outer radius ratio. REPORTED: Rorres 2000 table 1, N = 3, optimum 0.5357 (field screws 0.41 to 0.55). */
export const RADIUS_RATIO = 0.5357;
/** Pitch / outer diameter. REPORTED: Nagel's handbook simplifying choice L = 2.0 R_o (Rorres 2000, p. 78); field screws 1.0 to 1.19 (Simmons & Lubitz 2024, table 2). */
export const PITCH_RATIO = 1.0;
/** Default inclination, degrees. REPORTED: 22° is the most common angle of installed screws (Simmons & Lubitz 2024, citing Lashofer 2018). */
export const SLOPE_DEG_DEFAULT = 22;
/** Rotation speed rule, rpm for a diameter in metres: n = 50 / D^(2/3). REPORTED: Nagel 1968 as quoted by Rorres 2000, p. 73, and by Dellinger 2015 (eq. 2.19, Muysken 1932). The field screws of Simmons & Lubitz 2024 turn at 1.01 to 1.09 times it. */
export const SPEED_RULE_RPM = 50;
/** Speed rule of Brada 1999 for a screw used as a turbine: 56 / D^(2/3). REPORTED: Dellinger 2015 (eq. 2.20). */
export const SPEED_RULE_BRADA_RPM = 56;
/** Above this multiple of the rule the lab warns that the screw is too fast (field screws reach 1.09). ESTIMATE. */
export const SPEED_ALARM_FACTOR = 1.1;
/** Gap between blade tips and trough, m: g = 0.0045 · sqrt(D_o). REPORTED: Nagel 1968 as quoted by Dellinger 2015 (eq. 2.30); Simmons & Lubitz 2024 table 3 use 2 mm at 0.32 m and 6 mm at 1 m. */
export const GAP_COEFF = 0.0045;
/** Nagel's empirical leakage at full buckets: Q = 2.5 · gap · D_o · sqrt(D_o), m³/s. REPORTED: Dellinger 2015 (eq. 2.29). With the gap rule it is 0.01125 · D_o². */
export const NAGEL_LEAK_FACTOR = 2.5;
/** Gap-leakage coefficient of the Torricelli law Q = C · gap · ∫ sqrt(2 g Δh) dl along the blade tip. ESTIMATE: 1 is the ideal orifice; Simmons & Lubitz 2022 fit 0.7 to 1.1 to their CFD. With 1 the model leaks 9 % more than Nagel's law at D_o = 1 m (bucket.test.ts, screw.test.ts). Not calibrated. */
export const C_LEAK = 1.0;
/** Equivalent sand roughness of a new wooden screw, mm. ESTIMATE (planed wood, 0.2 to 0.9 mm in hydraulics tables). */
export const ROUGHNESS_NEW_MM = 0.5;
/** Inlet loss coefficient on the blade-tip velocity head, K · ½ρQ(ωR_o)². ESTIMATE (splash of the blades entering the pool, no source). */
export const K_INLET = 0.05;
/** Optimal tailwater submergence ψ_L = h_L / (D_o cos β) of a full screw. REPORTED: "roughly 0.60" (Nuernbergk 2020 as quoted by Simmons & Lubitz 2024). */
export const PSI_OPT = 0.6;
/** Outlet dynamic loss Π = a x² + b x + c with x = ψ_L − ψ_L*, for N = 3 (P_lo = ρ g Q D_o Π / (λ_f λ_β)). REPORTED: Simmons & Lubitz 2024, eq. 3.11; derived from their CFD, not measured on the lab's size. */
export const OUTLET_PI = { a: 0.8373, b: -0.2069, c: 0.06244 } as const;
/** Largest x = ψ_L − ψ_L* the correlation is applied to (their data stop at +0.2, with some points to +0.3): held beyond. */
export const OUTLET_X_MAX = 0.4;
/** Fill correction polynomial of the outlet loss, Π(f) = a f³ + b f² + c f + d, normalised by Π(1) = 0.081. REPORTED: eqs. 3.7 and 3.8. */
export const OUTLET_FILL_POLY = [-1.449, 4.378, -4.292, 1.444] as const;
/** Slope correction polynomial of the outlet loss in cos β, normalised at 22°. REPORTED: eqs. 3.9 and 3.10. */
export const OUTLET_SLOPE_POLY = [-2.3267, 4.2921, -1.9305] as const;
export const OUTLET_REF_SLOPE_DEG = 22;
/** Bearing friction coefficient and journal radius as a fraction of D_o. ESTIMATE (rolling bearings). */
export const BEARING_MU = 0.01;
export const BEARING_RADIUS_FRAC = 0.05;
/** Wood density, blade thickness / D_o and core wall thickness / D_o, for the mass on the bearings and the inertia. ESTIMATE. */
export const WOOD_DENSITY = 600;
export const BLADE_THICKNESS_FRAC = 0.025;
export const CORE_WALL_FRAC = 0.04;
/** Smallest usable flow as a fraction of the design flow: below it the gate is closed. ESTIMATE (a screw keeps a high efficiency down to about a fifth of its flow in Brada's tests, Dellinger 2015 fig. 2.7: 175 L/s against a peak near 350). */
export const FLOW_MIN_FRAC = 0.15;
/** Water speed in the intake canal, m/s, and loss coefficient of a clean rack. ESTIMATE; the rack is only there for the comparison with machines that need one. */
export const CANAL_SPEED = 0.8;
export const RACK_CLEAN_ZETA = 0.3;

// ------------------------------------------------------------------------------------------------ drive and generator

/** Efficiency of a chain stage and of a belt stage. ESTIMATE; Dellinger 2015 (citing Nuernbergk 2012) reports multipliers above 95 %. */
export const CHAIN_EFFICIENCY = 0.98;
export const BELT_EFFICIENCY = 0.96;
/** Largest ratio of one stage before a second stage is needed. ESTIMATE (pulley wrap and size). */
export const STAGE_RATIO_MAX = 5;
/** Generator: rated shaft speed, rpm. ESTIMATE from K7 ("several hundred rpm", a low-speed generator like those of wind turbines). */
export const GEN_RATED_RPM = 600;
/** Battery bus voltage, V, and rectifier drop (two diodes), V. ESTIMATE; the drop is the one of the Piggott lab (three-phase bridge). */
export const BUS_VOLTS = 48;
export const DIODE_DROP = 1.5;
/** A three-phase bridge gives 1.35 times the line voltage. DERIVED: 3√2/π. */
export const BRIDGE_FACTOR = 1.35;
/** The generator is wound so that at its rated speed the rectified open-circuit voltage is 12 % above the bus. ESTIMATE (design choice). */
export const GEN_HEADROOM = 0.12;

// ------------------------------------------------------------------------------------------------ the year

export const DAYS = 365;
export const SECONDS_PER_DAY = 86400;
export const HOURS_PER_YEAR = 8760;
/** Reserved flow as a fraction of the mean annual flow. ESTIMATE (the French rule of thumb of one tenth; not in the sources read; K16 gives 64 L/s on a mountain stream). */
export const RESERVED_FRACTION = 0.1;
/** A flood closes the gate above this multiple of the median flow. ESTIMATE. */
export const FLOOD_GATE_FACTOR = 6;

// ------------------------------------------------------------------------------------------------ the wheels (comparison)

/** Rim speed of the wheels at their best, m/s. ESTIMATE (the sources give no speed). */
export const WHEEL_RIM_SPEED = { overshot: 1.5, breastshot: 1.8 } as const;
/** Head lost between the water level and the wheel: tailwater clearance and feed, m. ESTIMATE. */
export const WHEEL_CLEARANCE = { overshot: 0.3, breastshot: 0.2, undershot: 0.0 } as const;
/** Mechanical efficiency of the wheel's bearings and arms. ESTIMATE. */
export const WHEEL_MECH = 0.97;
/** Velocity coefficient of a sluice. ESTIMATE (0.95 to 0.98 for a well-shaped gate). */
export const SLUICE_CV = 0.95;

/** Fraction of the buckets that is filled at the design flow (a third is the usual design). ESTIMATE. */
export const DESIGN_FILL = 1 / 3;
/** Depth of the buckets, m, and the share of it that holds water when full. ESTIMATE. */
export const BUCKET_DEPTH = 0.3;
export const BUCKET_FILL_SHARE = 0.5;
/** Height of the sluice opening of an undershot wheel, m. ESTIMATE. */
export const SLUICE_OPENING = 0.4;
/** Share of the drop lost per unit of bucket filling (the buckets empty earlier when they are fuller). ESTIMATE. */
export const SPILL_PER_FILL = 0.25;
/** Hydraulic factor of the buckets or blades at the best speed (entry shock, leaks). ESTIMATE. */
export const WHEEL_HYDRAULIC = { overshot: 0.96, breastshot: 0.9, undershot: 1 } as const;

/** Wheels can take a little more than their design flow with fuller buckets. ESTIMATE. */
export const WHEEL_CAPACITY_FACTOR = 1.3;
/** Mass of a wheel per square metre of its footprint D × width, kg/m². ESTIMATE (timber and iron). */
export const WHEEL_MASS_PER_AREA = 120;
/** Axial water speed through the runner of a Kaplan turbine, m/s. ESTIMATE (2 to 6 m/s in small propeller turbines). */
export const KAPLAN_AXIAL_SPEED = 4;

// ------------------------------------------------------------------------------------------------ time

/** Time constant of a machine that coasts to a stop on its bearings, s. ESTIMATE. */
export const TAU_STOP = 4;

/** Gravity and density re-exported for convenience: ρ g in N/m³. */
export const RHO_G = RHO * G;
