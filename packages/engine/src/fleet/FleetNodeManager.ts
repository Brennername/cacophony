import { NodeStatus } from '@cacophony/shared-types';
import { NodeHeartbeat } from '../telemetry/NodeHeartbeat';

interface Node {
  id: string;
  status: NodeStatus;
  lastHeartbeat: Date | null;
}

class FleetNodeManager {
  private nodes: Node[] = [];
  private heartbeatInterval: number = 30 * 1000; // 30 seconds

  constructor() {
    setInterval(() => this.checkHeartbeats(), this.heartbeatInterval);
  }

  public addNode(nodeId: string): void {
    const node: Node = { id: nodeId, status: NodeStatus.ONLINE, lastHeartbeat: null };
    this.nodes.push(node);
  }

  public updateHeartbeat(nodeId: string): void {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.lastHeartbeat = new Date();
    }
  }

  private checkHeartbeats(): void {
    const currentTime = new Date();

    for (const node of this.nodes) {
      if (node.status === NodeStatus.ONLINE && !node.lastHeartbeat) {
        node.status = NodeStatus.OFFLINE;
        console.log(`Node ${node.id} marked as OFFLINE due to missing heartbeat.`);
      } else if (node.status === NodeStatus.ONLINE && node.lastHeartbeat) {
        const timeSinceLastHeartbeat = currentTime.getTime() - node.lastHeartbeat.getTime();
        if (timeSinceLastHeartbeat >= this.heartbeatInterval * 3) {
          node.status = NodeStatus.OFFLINE;
          console.log(`Node ${node.id} marked as OFFLINE due to missing heartbeat for 3 consecutive intervals.`);
        }
      }
    }
  }
}

export default FleetNodeManager;