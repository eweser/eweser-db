import type { ConnectStatus, Room } from '../types';

export function changeStatus(
  room: Room<any>,
  status: ConnectStatus,
  onStatusChange?: (status: ConnectStatus) => void
) {
  room.connectStatus = status;
  if (onStatusChange) onStatusChange(status);
}
