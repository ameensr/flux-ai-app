import { describe, expect, it } from 'vitest';
import { createRoom, findSeatGroups, seatMetrics } from './seatModel';

describe('boardroom seat model', () => {
  it('places supplied attendees in distinct occupied seats with their roles', () => {
    const room = createRoom(['Asha (Engineer)', 'Dara'], ['Mira (Host)']);
    const occupied = room.seats.filter(seat => seat.member);
    expect(occupied).toHaveLength(3);
    expect(new Set(occupied.map(seat => seat.id)).size).toBe(3);
    expect(occupied.find(seat => seat.side === 'foot')?.member).toEqual({ name: 'Mira', role: 'Host' });
    expect(occupied.find(seat => seat.side === 'foot')?.facing).toEqual([0, -1]);
    expect(occupied.find(seat => seat.id === 'A01')?.member?.role).toBe('Engineer');
  });

  it('keeps the fallback viewpoint at seating position and creates no spare chairs', () => {
    const room = createRoom(['Asha', 'Dara'], ['Mira']);
    const viewSeat = room.viewSeat;
    expect(room.seats).toHaveLength(3);
    expect(room.seats.every(seat => seat.member)).toBe(true);
    expect(room.seats.some(seat => seat.id === viewSeat.id)).toBe(false);
    expect(viewSeat.z).toBe(room.seats.find(seat => seat.id === 'M01')?.z);
    expect(viewSeat.x).toBe(room.seats.find(seat => seat.id === 'M01')?.x);
    expect(viewSeat.z).toBeGreaterThan(room.focal[2]);
    expect(viewSeat.facing).toEqual([0, -1]);
  });

  it('does not create a second chair when a meeting host is also in the team list', () => {
    const room = createRoom(['Mira', 'Asha', 'asha'], ['Mira (Host)']);
    expect(room.seats).toHaveLength(2);
    expect(room.seats.map(seat => seat.member?.name).sort()).toEqual(['Asha', 'Mira']);
  });

  it('centres multiple meeting hosts opposite the TV', () => {
    const room = createRoom([], ['Mira', 'Noor']);
    expect(room.seats.map(seat => seat.side)).toEqual(['foot', 'foot']);
    expect(room.seats.map(seat => seat.x)).toEqual([-.4, .4]);
    expect(room.seats.every(seat => seat.z > 0 && seat.facing[1] === -1)).toBe(true);
  });

  it('centres each side of the table with even chair spacing', () => {
    const room = createRoom(['A', 'B', 'C', 'D', 'E'], ['Host']);
    const left = room.seats.filter(seat => seat.side === 'left');
    const right = room.seats.filter(seat => seat.side === 'right');
    expect(left.map(seat => seat.z)).toEqual([-.98, 0, .98]);
    expect(right.map(seat => seat.z)).toEqual([-.49, .49]);
    expect(left.every(seat => seat.x < 0)).toBe(true);
    expect(right.every(seat => seat.x > 0)).toBe(true);
  });

  it('scores each physical seat and changes ranking criteria', () => {
    const room = createRoom(['Asha', 'Dara', 'Ivo'], []);
    const left = room.seats.find(seat => seat.id === 'A02')!;
    const overall = seatMetrics(left, room, 'overall');
    const closest = seatMetrics(left, room, 'closest');
    expect(overall.distance).toBeGreaterThan(0);
    expect(overall.horizontalAngle).toBeGreaterThanOrEqual(0);
    expect(overall.score).toBeGreaterThanOrEqual(0);
    expect(overall.score).toBeLessThanOrEqual(100);
    expect(closest.score).not.toBe(overall.score);
  });

  it('does not recommend assigned chairs as available seats', () => {
    const room = createRoom(['Asha', 'Dara', 'Ivo', 'Mina'], ['Host']);
    const groups = findSeatGroups(room, 2);
    expect(groups).toEqual([]);
  });
});
