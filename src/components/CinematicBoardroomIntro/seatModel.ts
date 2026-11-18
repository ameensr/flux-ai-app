export type Side = 'left' | 'right' | 'head' | 'foot';
export type Priority = 'overall' | 'closest' | 'central' | 'visibility' | 'group';
export interface Member { name: string; role?: string; department?: string; avatarUrl?: string }
export interface Seat { id: string; side: Side; index: number; x: number; z: number; facing: [number, number]; member?: Member; reserved?: boolean }
export interface Room { width: number; length: number; seats: Seat[]; viewSeat: Seat; focal: [number, number, number] }
export interface SeatMetrics { distance: number; horizontalAngle: number; verticalAngle: number; central: boolean; obstructed: boolean; nearby: string[]; score: number }

export const WEIGHTS: Record<Priority, { distance: number; presenter: number; angle: number; vertical: number; visibility: number; access: number; together: number }> = {
  overall: { distance: .17, presenter: .08, angle: .24, vertical: .06, visibility: .21, access: .10, together: .14 },
  closest: { distance: .30, presenter: .27, angle: .14, vertical: .04, visibility: .13, access: .07, together: .05 },
  central: { distance: .10, presenter: .05, angle: .48, vertical: .05, visibility: .17, access: .08, together: .07 },
  visibility: { distance: .10, presenter: .05, angle: .20, vertical: .10, visibility: .42, access: .08, together: .05 },
  group: { distance: .09, presenter: .05, angle: .14, vertical: .05, visibility: .15, access: .08, together: .44 },
};

export function memberFromName(value: string): Member {
  const match = value.trim().match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return { name: match ? match[1].trim() : value.trim(), role: match?.[2]?.trim() };
}

export function createRoom(team: string[], senior: string[]): Room {
  const seen = new Set<string>();
  const unique = (names: string[]) => names.filter(value => {
    const key = memberFromName(value).name.toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const seniorNames = unique(senior);
  const teamNames = unique(team);
  const left = teamNames.filter((_, index) => index % 2 === 0);
  const right = teamNames.filter((_, index) => index % 2 === 1);
  const sideCount = Math.max(left.length, right.length);
  const length = Math.max(3.8, 1.5 + sideCount * .98);
  const width = Math.max(2.5, seniorNames.length * .8 + .7);
  const seats: Seat[] = [];
  const add = (side: Side, index: number, x: number, z: number, facing: [number, number], name: string) => {
    seats.push({ id: `${side === 'left' ? 'A' : side === 'right' ? 'B' : 'M'}${String(index + 1).padStart(2, '0')}`, side, index, x, z, facing, member: memberFromName(name) });
  };
  left.forEach((name, i) => add('left', i, -(width / 2 + .72), (i - (left.length - 1) / 2) * .98, [1, 0], name));
  right.forEach((name, i) => add('right', i, width / 2 + .72, (i - (right.length - 1) / 2) * .98, [-1, 0], name));
  seniorNames.forEach((name, i) => add('foot', i, (i - (seniorNames.length - 1) / 2) * .8, length / 2 + .68, [0, -1], name));
  const viewSeat: Seat = { id: 'VIEW', side: 'foot', index: -1, x: 0, z: length / 2 + .68, facing: [0, -1] };
  return { width, length, seats, viewSeat, focal: [0, 1.65, -length / 2 - 1.85] };
}

export function seatMetrics(seat: Seat, room: Room, priority: Priority = 'overall'): SeatMetrics {
  const [fx, fy, fz] = seat.side === 'head' ? [0, 1.2, 0] : room.focal;
  const dx = fx - seat.x, dz = fz - seat.z;
  const distance = Math.hypot(dx, dz);
  const forward = Math.max(-1, Math.min(1, (dx * seat.facing[0] + dz * seat.facing[1]) / distance));
  const horizontalAngle = Math.acos(forward) * 180 / Math.PI;
  const verticalAngle = Math.atan2(fy - 1.22, distance) * 180 / Math.PI;
  const obstructed = room.seats.some(other => {
    if (other === seat || !other.member) return false;
    const t = ((other.x - seat.x) * dx + (other.z - seat.z) * dz) / (distance * distance);
    if (t <= .06 || t >= .92) return false;
    return Math.hypot(other.x - seat.x - t * dx, other.z - seat.z - t * dz) < .38;
  });
  const neighbors = room.seats.filter(other => other !== seat && other.side === seat.side && Math.abs(other.index - seat.index) === 1);
  const nearby = neighbors.filter(other => other.member).map(other => other.member!.name);
  const freeNeighbors = neighbors.filter(other => !other.member && !other.reserved).length;
  const central = Math.abs(seat.x) < .65 || horizontalAngle < 32;
  const w = WEIGHTS[priority];
  const qualities = {
    distance: Math.max(0, 1 - Math.max(0, distance - 2) / (room.length + 2)),
    presenter: Math.max(0, 1 - Math.hypot(seat.x, seat.z + room.length / 2 + .72) / (room.length + 2)),
    angle: Math.max(0, 1 - horizontalAngle / 180),
    vertical: Math.max(0, 1 - verticalAngle / 45),
    visibility: obstructed ? .25 : 1,
    access: seat.side === 'head' || seat.side === 'foot' || seat.index === 0 || seat.index === Math.max(...room.seats.filter(s => s.side === seat.side).map(s => s.index)) ? 1 : .78,
    together: Math.min(1, freeNeighbors / 2),
  };
  const score = Math.round(100 * Object.entries(w).reduce((sum, [key, weight]) => sum + qualities[key as keyof typeof qualities] * weight, 0));
  return { distance, horizontalAngle, verticalAngle, central, obstructed, nearby, score };
}

export function findSeatGroups(room: Room, count: number, priority: Priority = 'overall') {
  const size = Math.max(1, Math.floor(count));
  const groups: { seats: Seat[]; score: number }[] = [];
  for (const side of ['left', 'right', 'head', 'foot'] as Side[]) {
    const row = room.seats.filter(s => s.side === side).sort((a, b) => a.index - b.index);
    for (let i = 0; i + size <= row.length; i++) {
      const seats = row.slice(i, i + size);
      if (seats.every((s, j) => !s.member && !s.reserved && (j === 0 || s.index === seats[j - 1].index + 1))) {
        groups.push({ seats, score: Math.round(seats.reduce((sum, s) => sum + seatMetrics(s, room, priority).score, 0) / size) });
      }
    }
  }
  return groups.sort((a, b) => b.score - a.score).slice(0, 5);
}
