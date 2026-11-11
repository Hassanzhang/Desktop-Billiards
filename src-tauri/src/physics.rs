use serde::Serialize;

const DRAG: f64 = 0.45;
const REBOUND: f64 = 0.88;
const IMPULSE: f64 = 0.96;
const STROKE_SECONDS: f64 = 0.12;

#[derive(Clone, Serialize)]
pub struct Ball {
    pub x: f64,
    pub y: f64,
    pub radius: f64,
    pub sunk: bool,
    vx: f64,
    vy: f64,
}
impl Ball {
    fn new(x: f64, y: f64, radius: f64) -> Self {
        Self {
            x,
            y,
            radius,
            sunk: false,
            vx: 0.,
            vy: 0.,
        }
    }
}
#[derive(Clone, Copy, Serialize, PartialEq, Debug)]
#[serde(rename_all = "snake_case")]
pub enum Phase {
    Ready,
    Stroke,
    Rolling,
    ReturnWhite,
    BallInHand,
    Finished,
}
#[derive(Serialize)]
pub struct Guide {
    pub role: &'static str,
    pub start: [f64; 2],
    pub end: [f64; 2],
}
#[derive(Serialize)]
pub struct Table {
    pub bounds: [f64; 4],
    pub pockets: [[f64; 2]; 6],
    pub pocket_radius: f64,
    pub cushions: Vec<[[f64; 2]; 4]>,
    pub rail_depth: f64,
    pub max_pull: f64,
    pub pulling: bool,
    pub stroke_progress: f64,
    pub cue_follow: f64,
    pub stroke_origin: [f64; 2],
    pub ghost: Option<[f64; 2]>,
    pub tile: f64,
    pub balls: Vec<Ball>,
    pub phase: Phase,
    pub aim: [f64; 2],
    pub charge: f64,
    pub seconds: u64,
    pub guide: Vec<Guide>,
    #[serde(skip)]
    elapsed: f64,
    #[serde(skip)]
    wait: f64,
    #[serde(skip)]
    power: f64,
    #[serde(skip)]
    pull_origin: Option<[f64; 2]>,
}
impl Table {
    pub fn new(width: f64, height: f64, count: usize) -> Self {
        let [l, t, r, b] = [width * 0.06, height * 0.09, width * 0.94, height * 0.91];
        let w = r - l;
        let h = b - t;
        let columns = ((((8 * count + 1) as f64).sqrt() - 1.) / 2.).ceil().max(1.) as usize;
        let pitch = 50_f64
            .min(w * 0.45 / (columns as f64 + 0.5))
            .min(h * 0.79 / columns as f64);
        let radius = pitch * 0.46;
        let mut balls = vec![Ball::new(l + w * 0.2, (t + b) / 2., radius)];
        for col in 0..columns {
            let depth = (col + 1).min(count + 1 - balls.len());
            for i in 0..depth {
                balls.push(Ball::new(
                    l + w * 0.52 + col as f64 * pitch * 0.84,
                    (t + b) / 2. + (i as f64 - (depth - 1) as f64 / 2.) * pitch * 0.95,
                    radius,
                ));
            }
        }
        let pocket_radius = (radius * 1.65).clamp(12., 38.);
        let rail_depth = (h * 0.032).clamp(10., 24.);
        let corner = pocket_radius * 1.35;
        let side = pocket_radius * 1.15;
        let mid = (l + r) / 2.;
        let cushions = vec![
            cushion([l + corner, t], [mid - side, t], [0., -1.], rail_depth),
            cushion([mid + side, t], [r - corner, t], [0., -1.], rail_depth),
            cushion([l + corner, b], [mid - side, b], [0., 1.], rail_depth),
            cushion([mid + side, b], [r - corner, b], [0., 1.], rail_depth),
            cushion([l, t + corner], [l, b - corner], [-1., 0.], rail_depth),
            cushion([r, t + corner], [r, b - corner], [1., 0.], rail_depth),
        ];
        let mut table = Self {
            bounds: [l, t, r, b],
            pockets: [
                [l, t],
                [(l + r) / 2., t],
                [r, t],
                [l, b],
                [(l + r) / 2., b],
                [r, b],
            ],
            pocket_radius,
            cushions,
            rail_depth,
            max_pull: (h * 0.24).clamp(80., 180.),
            pulling: false,
            stroke_progress: 0.,
            cue_follow: 0.,
            stroke_origin: [0., 0.],
            ghost: None,
            tile: 64_f64.min(pitch * 0.7),
            balls,
            phase: Phase::Ready,
            aim: [1., 0.022],
            charge: 0.,
            seconds: 0,
            elapsed: 0.,
            wait: 0.,
            power: 0.,
            pull_origin: None,
            guide: vec![],
        };
        table.update_guide();
        table
    }
    fn height(&self) -> f64 {
        self.bounds[3] - self.bounds[1]
    }
    fn speed(&self, power: f64) -> f64 {
        self.height() * 4.5 * power.clamp(0., 1.)
    }
    pub fn aim_at(&mut self, x: f64, y: f64) {
        if self.phase != Phase::Ready || self.pulling {
            return;
        }
        let dx = x - self.balls[0].x;
        let dy = y - self.balls[0].y;
        let len = dx.hypot(dy);
        if len > 2. {
            self.aim = [dx / len, dy / len];
        }
    }
    pub fn begin_pull(&mut self, x: f64, y: f64) {
        if self.phase != Phase::Ready || self.pulling {
            return;
        }
        let [l, t, r, b] = self.bounds;
        if x < l || x > r || y < t || y > b {
            return;
        }
        self.pull_origin = Some([x, y]);
        self.pulling = true;
        self.charge = 0.;
    }
    pub fn pull_to(&mut self, x: f64, y: f64) {
        if let Some(origin) = self.pull_origin {
            self.charge = (((origin[0] - x) * self.aim[0] + (origin[1] - y) * self.aim[1])
                / self.max_pull)
                .clamp(0., 1.);
        }
    }
    pub fn cancel_pull(&mut self) {
        self.pulling = false;
        self.pull_origin = None;
        if self.phase == Phase::Ready {
            self.charge = 0.;
        }
    }
    pub fn release_pull(&mut self) -> bool {
        let power = self.charge;
        let pulling = self.pulling;
        self.cancel_pull();
        pulling && self.shoot(power)
    }
    pub fn turn(&mut self, radians: f64) {
        if self.phase != Phase::Ready || self.pulling {
            return;
        }
        let angle = self.aim[1].atan2(self.aim[0]) + radians;
        self.aim = [angle.cos(), angle.sin()];
    }
    pub fn shoot(&mut self, power: f64) -> bool {
        if self.phase != Phase::Ready || !power.is_finite() || power <= 0.005 {
            return false;
        }
        self.power = self.speed(power);
        self.charge = power.clamp(0., 1.);
        self.pulling = false;
        self.pull_origin = None;
        self.stroke_origin = [self.balls[0].x, self.balls[0].y];
        self.cue_follow = 0.;
        self.phase = Phase::Stroke;
        self.stroke_progress = 0.;
        self.wait = 0.;
        true
    }
    pub fn place_white(&mut self, x: f64, y: f64) -> bool {
        if self.phase != Phase::BallInHand {
            return false;
        }
        let r = self.balls[0].radius;
        let [l, t, right, b] = self.bounds;
        if x < l + r || x > right - r || y < t + r || y > b - r {
            return false;
        }
        if self
            .pockets
            .iter()
            .any(|p| (x - p[0]).hypot(y - p[1]) < self.pocket_radius + r)
            || self
                .balls
                .iter()
                .skip(1)
                .any(|ball| !ball.sunk && (x - ball.x).hypot(y - ball.y) < r + ball.radius + 2.)
        {
            return false;
        }
        self.balls[0] = Ball::new(x, y, r);
        self.phase = Phase::Ready;
        self.wait = 0.;
        true
    }
    pub fn step(&mut self, dt: f64) {
        let mut dt = dt.clamp(0., 0.05);
        if self.phase == Phase::Finished {
            return;
        }
        self.cue_follow = (self.cue_follow - dt / 0.07).max(0.);
        self.elapsed += dt;
        self.seconds = self.elapsed as u64;
        match self.phase {
            Phase::ReturnWhite => {
                self.wait += dt;
                if self.wait >= 0.8 {
                    self.phase = Phase::BallInHand;
                    let [l, t, r, b] = self.bounds;
                    'outer: for fx in [0.2, 0.31, 0.42, 0.54, 0.66, 0.78] {
                        for fy in [0.5, 0.31, 0.69, 0.19, 0.81] {
                            if self.place_white(l + (r - l) * fx, t + (b - t) * fy) {
                                break 'outer;
                            }
                        }
                    }
                }
                return;
            }
            Phase::Ready | Phase::BallInHand => return,
            Phase::Stroke => {
                self.wait += dt;
                self.stroke_progress = (self.wait / STROKE_SECONDS).min(1.);
                if self.wait < STROKE_SECONDS {
                    return;
                }
                self.balls[0].vx = self.aim[0] * self.power;
                self.balls[0].vy = self.aim[1] * self.power;
                self.cue_follow = 1.;
                self.phase = Phase::Rolling;
                dt = self.wait - STROKE_SECONDS;
            }
            _ => (),
        }
        let height = self.height();
        let speed = self
            .balls
            .iter()
            .filter(|b| !b.sunk)
            .map(|b| b.vx.hypot(b.vy))
            .fold(0., f64::max);
        let steps = (dt * 180_f64.max(speed / self.balls[0].radius.max(0.5) * 1.7))
            .ceil()
            .max(1.) as usize;
        let h = dt / steps as f64;
        for _ in 0..steps {
            for ball in &mut self.balls {
                if ball.sunk {
                    continue;
                }
                ball.x += ball.vx * h;
                ball.y += ball.vy * h;
                ball.sunk = self
                    .pockets
                    .iter()
                    .any(|p| (ball.x - p[0]).hypot(ball.y - p[1]) < self.pocket_radius * 0.82);
                if !ball.sunk {
                    rails(ball, &self.cushions);
                }
            }
            // ponytail: pairwise collision checks suit desktop-sized racks; use spatial buckets if profiling warrants it.
            for i in 0..self.balls.len() {
                let (left, right) = self.balls.split_at_mut(i + 1);
                let a = &mut left[i];
                if a.sunk {
                    continue;
                }
                for b in right.iter_mut().filter(|b| !b.sunk) {
                    collide(a, b);
                }
            }
            for ball in self.balls.iter_mut().filter(|b| !b.sunk) {
                rails(ball, &self.cushions);
                let speed = ball.vx.hypot(ball.vy);
                if speed > 0. {
                    let drag = (1. - height * DRAG * h / speed).max(0.);
                    ball.vx *= drag;
                    ball.vy *= drag;
                }
            }
        }
        let cleared = self.balls.iter().skip(1).all(|b| b.sunk);
        if cleared
            || self
                .balls
                .iter()
                .filter(|b| !b.sunk)
                .all(|b| b.vx.hypot(b.vy) < height * 0.008)
        {
            for ball in &mut self.balls {
                ball.vx = 0.;
                ball.vy = 0.;
            }
            self.charge = 0.;
            self.wait = 0.;
            self.phase = if cleared {
                Phase::Finished
            } else if self.balls[0].sunk {
                Phase::ReturnWhite
            } else {
                Phase::Ready
            };
        }
    }
    fn guide_leg(
        &self,
        origin: [f64; 2],
        v: [f64; 2],
        radius: f64,
        exclude: Option<usize>,
    ) -> ([f64; 2], [f64; 2], Option<usize>, [f64; 2]) {
        let speed = v[0].hypot(v[1]);
        let stop = self.height() * 0.008;
        if speed <= stop {
            return (origin, [0., 0.], None, [0., 0.]);
        }
        let d = [v[0] / speed, v[1] / speed];
        let drag = self.height() * DRAG;
        let mut distance = (speed * speed - stop * stop) / (2. * drag);
        let mut normal = [0., 0.];
        let mut hit = None;
        for polygon in &self.cushions {
            for i in 0..4 {
                let a = polygon[i];
                let b = polygon[(i + 1) % 4];
                let edge = [b[0] - a[0], b[1] - a[1]];
                let len = edge[0].hypot(edge[1]);
                let center = polygon
                    .iter()
                    .fold([0., 0.], |s, p| [s[0] + p[0] / 4., s[1] + p[1] / 4.]);
                let mut n = [-edge[1] / len, edge[0] / len];
                if n[0] * (center[0] - a[0]) + n[1] * (center[1] - a[1]) > 0. {
                    n = [-n[0], -n[1]];
                }
                let toward = d[0] * n[0] + d[1] * n[1];
                if toward < -1e-6 {
                    let entry =
                        (radius - (origin[0] - a[0]) * n[0] - (origin[1] - a[1]) * n[1]) / toward;
                    let point = [
                        origin[0] + d[0] * entry - n[0] * radius,
                        origin[1] + d[1] * entry - n[1] * radius,
                    ];
                    let along =
                        ((point[0] - a[0]) * edge[0] + (point[1] - a[1]) * edge[1]) / (len * len);
                    if entry >= 0. && entry < distance && (0. ..=1.).contains(&along) {
                        distance = entry;
                        normal = n;
                    }
                }
                // Rounded endpoints of the radius-expanded cushion, matching circle/segment contact.
                if let Some(entry) = ray_circle(origin, d, a, radius) {
                    if entry < distance {
                        distance = entry;
                        normal = [
                            (origin[0] + d[0] * entry - a[0]) / radius,
                            (origin[1] + d[1] * entry - a[1]) / radius,
                        ];
                    }
                }
            }
        }
        for (i, ball) in self.balls.iter().enumerate().skip(1) {
            if ball.sunk || exclude == Some(i) {
                continue;
            }
            if let Some(entry) = ray_circle(origin, d, [ball.x, ball.y], radius + ball.radius) {
                if entry < distance {
                    distance = entry;
                    hit = Some(i);
                    normal = [0., 0.];
                }
            }
        }
        for p in self.pockets {
            if let Some(entry) = ray_circle(origin, d, p, self.pocket_radius * 0.82) {
                if entry <= distance {
                    distance = entry;
                    hit = None;
                    normal = [0., 0.];
                }
            }
        }
        let remaining = (speed * speed - 2. * drag * distance).max(0.).sqrt();
        (
            [origin[0] + d[0] * distance, origin[1] + d[1] * distance],
            [d[0] * remaining, d[1] * remaining],
            hit,
            normal,
        )
    }
    pub fn update_guide(&mut self) {
        self.guide.clear();
        self.ghost = None;
        if self.phase != Phase::Ready {
            return;
        }
        let white = &self.balls[0];
        let start = [white.x, white.y];
        let radius = white.radius;
        let speed = self.speed(if self.pulling { self.charge } else { 0.55 });
        let (end, v, hit, rail) = self.guide_leg(
            start,
            [self.aim[0] * speed, self.aim[1] * speed],
            radius,
            None,
        );
        self.guide.push(Guide {
            role: "incoming",
            start: [
                start[0] + self.aim[0] * (radius + 5.),
                start[1] + self.aim[1] * (radius + 5.),
            ],
            end,
        });
        if let Some(i) = hit {
            self.ghost = Some(end);
            let ball = &self.balls[i];
            let pos = [ball.x, ball.y];
            let dist = (pos[0] - end[0]).hypot(pos[1] - end[1]);
            if dist <= 1e-6 {
                return;
            }
            let n = [(pos[0] - end[0]) / dist, (pos[1] - end[1]) / dist];
            let impulse = (v[0] * n[0] + v[1] * n[1]) * IMPULSE;
            let push = [impulse * n[0], impulse * n[1]];
            let target_radius = ball.radius;
            let white_end = self
                .guide_leg(end, [v[0] - push[0], v[1] - push[1]], radius, Some(i))
                .0;
            let target_end = self.guide_leg(pos, push, target_radius, Some(i)).0;
            self.guide.push(Guide {
                role: "white",
                start: end,
                end: white_end,
            });
            self.guide.push(Guide {
                role: "target",
                start: pos,
                end: target_end,
            });
        } else if rail[0] != 0. || rail[1] != 0. {
            let dot = v[0] * rail[0] + v[1] * rail[1];
            let rebound = [
                v[0] - (1. + REBOUND) * dot * rail[0],
                v[1] - (1. + REBOUND) * dot * rail[1],
            ];
            self.guide.push(Guide {
                role: "white",
                start: end,
                end: self.guide_leg(end, rebound, radius, None).0,
            });
        }
    }
}
fn ray_circle(o: [f64; 2], d: [f64; 2], c: [f64; 2], r: f64) -> Option<f64> {
    let off = [c[0] - o[0], c[1] - o[1]];
    let forward = off[0] * d[0] + off[1] * d[1];
    let across = off[0] * d[1] - off[1] * d[0];
    let clearance = r * r - across * across;
    (forward > 0. && clearance > 0.).then(|| (forward - clearance.sqrt()).max(0.))
}
fn cushion(start: [f64; 2], end: [f64; 2], outward: [f64; 2], depth: f64) -> [[f64; 2]; 4] {
    let len = (end[0] - start[0]).hypot(end[1] - start[1]);
    let tangent = [(end[0] - start[0]) / len, (end[1] - start[1]) / len];
    [
        start,
        end,
        [
            end[0] + outward[0] * depth + tangent[0] * depth * 0.65,
            end[1] + outward[1] * depth + tangent[1] * depth * 0.65,
        ],
        [
            start[0] + outward[0] * depth - tangent[0] * depth * 0.65,
            start[1] + outward[1] * depth - tangent[1] * depth * 0.65,
        ],
    ]
}
fn rails(ball: &mut Ball, cushions: &[[[f64; 2]; 4]]) {
    for polygon in cushions {
        let mut nearest = [0., 0.];
        let mut distance = f64::INFINITY;
        let mut inside = false;
        for i in 0..4 {
            let a = polygon[i];
            let b = polygon[(i + 1) % 4];
            if (a[1] > ball.y) != (b[1] > ball.y)
                && ball.x < (b[0] - a[0]) * (ball.y - a[1]) / (b[1] - a[1]) + a[0]
            {
                inside = !inside;
            }
            let edge = [b[0] - a[0], b[1] - a[1]];
            let u = (((ball.x - a[0]) * edge[0] + (ball.y - a[1]) * edge[1])
                / (edge[0] * edge[0] + edge[1] * edge[1]))
                .clamp(0., 1.);
            let point = [a[0] + edge[0] * u, a[1] + edge[1] * u];
            let d = (ball.x - point[0]).hypot(ball.y - point[1]);
            if d < distance {
                distance = d;
                nearest = point;
            }
        }
        if !inside && distance >= ball.radius {
            continue;
        }
        let sign = if inside { -1. } else { 1. };
        let normal = if distance > 1e-9 {
            [
                sign * (ball.x - nearest[0]) / distance,
                sign * (ball.y - nearest[1]) / distance,
            ]
        } else {
            let center = polygon
                .iter()
                .fold([0., 0.], |s, p| [s[0] + p[0] / 4., s[1] + p[1] / 4.]);
            let d = (nearest[0] - center[0]).hypot(nearest[1] - center[1]);
            [(nearest[0] - center[0]) / d, (nearest[1] - center[1]) / d]
        };
        let correction = ball.radius - sign * distance;
        ball.x += normal[0] * correction;
        ball.y += normal[1] * correction;
        let closing = ball.vx * normal[0] + ball.vy * normal[1];
        if closing < 0. {
            ball.vx -= (1. + REBOUND) * closing * normal[0];
            ball.vy -= (1. + REBOUND) * closing * normal[1];
        }
    }
}
fn collide(a: &mut Ball, b: &mut Ball) {
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let limit = a.radius + b.radius;
    let distance = dx.hypot(dy);
    if distance >= limit {
        return;
    }
    let (nx, ny) = if distance > 1e-6 {
        (dx / distance, dy / distance)
    } else {
        (1., 0.)
    };
    let correction = (limit - distance) * 0.5;
    a.x -= nx * correction;
    a.y -= ny * correction;
    b.x += nx * correction;
    b.y += ny * correction;
    let closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if closing < 0. {
        let impulse = -closing * IMPULSE;
        a.vx -= nx * impulse;
        a.vy -= ny * impulse;
        b.vx += nx * impulse;
        b.vy += ny * impulse;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn pull_locks_aim_and_uses_distance_instead_of_hold_time() {
        let mut t = Table::new(1600., 1000., 2);
        assert!(t.balls.iter().all(|b| b.radius == t.balls[0].radius));
        let (x, y) = (t.balls[0].x + 150., t.balls[0].y);
        t.aim_at(x, y);
        t.begin_pull(x, y);
        t.pull_to(x - t.max_pull * 0.07, y + 200.);
        t.aim_at(x + 100., y + 500.);
        for _ in 0..100 {
            t.step(0.05);
        }
        assert!((t.charge - 0.07).abs() < 1e-9);
        assert_eq!(t.aim, [1., 0.]);
        assert!(t.release_pull());
        assert!((t.charge - 0.07).abs() < 1e-9);
        let before = t.balls[0].x;
        t.step(0.05);
        assert!(t.stroke_progress > 0. && t.stroke_progress < 1.);
        assert_eq!(t.balls[0].x, before);
        t.step(0.05);
        t.step(0.03);
        assert_eq!(t.phase, Phase::Rolling);
        assert_eq!(t.cue_follow, 1.);
        t.step(0.02);
        assert!(t.cue_follow > 0. && t.cue_follow < 1.);
        assert!(t.balls[0].vx > 0. && t.balls[0].vx < t.speed(0.18));
        let mut t = Table::new(1600., 1000., 2);
        t.begin_pull(x, y);
        t.pull_to(x + 40., y);
        assert!(!t.release_pull());
        assert_eq!(t.phase, Phase::Ready);
        t.begin_pull(x, y);
        t.pull_to(x - 40., y);
        t.cancel_pull();
        assert!(!t.release_pull());
        assert!(!t.shoot(0.));
        assert!(!t.shoot(f64::NAN));
        let old = t.aim;
        t.turn(0.001);
        assert_ne!(t.aim, old);
        let fine = t.aim;
        t.begin_pull(x, y);
        assert_eq!(t.aim, fine, "Starting a pull must preserve fine aiming");
    }
    #[test]
    fn pockets_have_open_mouths_and_jaws_reflect() {
        for pocket in 0..6 {
            let mut t = Table::new(1600., 1000., 1);
            t.balls[1].x = (t.bounds[0] + t.bounds[2]) / 2.;
            t.balls[1].y = (t.bounds[1] + t.bounds[3]) / 2.;
            let p = t.pockets[pocket];
            let dx: f64 = if pocket % 3 == 0 {
                1.
            } else if pocket % 3 == 2 {
                -1.
            } else {
                0.
            };
            let dy: f64 = if pocket < 3 { 1. } else { -1. };
            let len = dx.hypot(dy);
            t.balls[0].x = p[0] + dx / len * 110.;
            t.balls[0].y = p[1] + dy / len * 110.;
            t.balls[0].vx = -dx / len * 500.;
            t.balls[0].vy = -dy / len * 500.;
            t.phase = Phase::Rolling;
            for _ in 0..35 {
                t.step(0.01);
            }
            assert!(
                t.balls[0].sunk,
                "Pocket {pocket} must be reachable without a rectangular wall"
            );
        }
        let t = Table::new(1600., 1000., 1);
        let polygon = t.cushions[0];
        let a = polygon[1];
        let b = polygon[2];
        let edge = [b[0] - a[0], b[1] - a[1]];
        let len = edge[0].hypot(edge[1]);
        let n = [-edge[1] / len, edge[0] / len];
        let radius = t.balls[0].radius;
        let mut ball = Ball::new(
            (a[0] + b[0]) / 2. + n[0] * radius * 0.8,
            (a[1] + b[1]) / 2. + n[1] * radius * 0.8,
            radius,
        );
        ball.vx = -n[0] * 400.;
        ball.vy = -n[1] * 400.;
        rails(&mut ball, &[polygon]);
        assert!(
            ball.vx * n[0] + ball.vy * n[1] > 300.,
            "Jaw must reflect along its slanted normal"
        );
    }
    #[test]
    fn chain_shot_stops_and_rearms() {
        let mut t = Table::new(1600., 1000., 2);
        for i in 1..3 {
            t.balls[i].x = t.balls[0].x + 250. + (i - 1) as f64 * (t.balls[1].radius * 2. + 8.);
            t.balls[i].y = t.balls[0].y;
        }
        t.aim = [1., 0.];
        assert!(t.shoot(0.9));
        assert!(!t.shoot(1.));
        let mut moved = false;
        let mut reflected = false;
        for _ in 0..600 {
            t.step(0.012);
            moved |= t.balls[2].vx > 50.;
            reflected |= moved && t.balls[2].vx < -30.;
        }
        assert!(moved && reflected);
        assert_eq!(t.phase, Phase::Ready);
    }
    #[test]
    fn scratch_returns_and_finished_clock_freezes() {
        let mut t = Table::new(1600., 1000., 2);
        t.phase = Phase::Rolling;
        t.balls[0].x = t.pockets[0][0];
        t.balls[0].y = t.pockets[0][1];
        t.step(0.01);
        assert_eq!(t.phase, Phase::ReturnWhite);
        for _ in 0..20 {
            t.step(0.05);
        }
        assert_eq!(t.phase, Phase::Ready);
        assert!(!t.balls[0].sunk);
        t.phase = Phase::Rolling;
        for i in 1..3 {
            t.balls[i].x = t.pockets[i][0];
            t.balls[i].y = t.pockets[i][1];
        }
        t.step(0.01);
        assert_eq!(t.phase, Phase::Finished);
        let elapsed = t.elapsed;
        t.step(0.05);
        assert_eq!(t.elapsed, elapsed);
    }
    #[test]
    fn placement_rejects_pocket_edges_and_occupied_spots() {
        let mut t = Table::new(1600., 1000., 3);
        t.balls[0].sunk = true;
        t.phase = Phase::BallInHand;
        assert!(!t.place_white(t.pockets[0][0], t.pockets[0][1]));
        assert!(!t.place_white(-1., 300.));
        assert!(!t.place_white(t.balls[1].x, t.balls[1].y));
        assert!(t.place_white(400., 400.));
        assert_eq!(t.phase, Phase::Ready);
        assert!(!t.balls[0].sunk);
        assert!(t.shoot(0.7));
    }
    #[test]
    fn cut_shot_predicts_both_outgoing_balls_and_charge_changes_distance() {
        let mut t = Table::new(1600., 1000., 2);
        t.balls[1].x = t.balls[0].x + 240.;
        t.balls[1].y = t.balls[0].y + 15.;
        t.balls[2].x = t.bounds[2] - 100.;
        t.balls[2].y = t.bounds[1] + 100.;
        t.aim = [1., 0.];
        t.update_guide();
        assert_eq!(t.guide.len(), 3);
        assert_eq!(t.ghost, Some(t.guide[0].end));
        assert_eq!(t.guide[1].role, "white");
        assert!(t.guide[1].end[1] < t.guide[1].start[1]);
        assert_eq!(t.guide[2].role, "target");
        assert!(t.guide[2].end[1] > t.guide[2].start[1]);
        t.shoot(0.8);
        t.update_guide();
        assert!(t.guide.is_empty());
        let reset = Table::new(1600., 1000., 2);
        assert_eq!(reset.phase, Phase::Ready);
        assert_eq!(reset.seconds, 0);
        assert!(reset.balls.iter().all(|b| !b.sunk));
    }
    #[test]
    fn crowded_rack_stays_inside_and_guide_reflects() {
        for count in [1, 61, 300] {
            let mut t = Table::new(1600., 1000., count);
            assert_eq!(t.balls.len(), count + 1);
            t.shoot(1.);
            for _ in 0..100 {
                t.step(0.016);
                for b in t.balls.iter().filter(|b| !b.sunk) {
                    assert!(
                        b.x >= t.bounds[0] - t.pocket_radius
                            && b.x <= t.bounds[2] + t.pocket_radius
                            && b.y >= t.bounds[1] - t.pocket_radius
                            && b.y <= t.bounds[3] + t.pocket_radius
                    );
                }
            }
        }
        let mut t = Table::new(4200., 700., 1);
        t.balls[0].x = t.bounds[2] - 180.;
        t.balls[1].y = t.balls[0].y - 150.;
        t.aim = [1., 0.];
        t.update_guide();
        assert_eq!(t.guide[1].role, "white");
        assert!(t.guide[1].end[0] < t.guide[1].start[0]);
    }
}
