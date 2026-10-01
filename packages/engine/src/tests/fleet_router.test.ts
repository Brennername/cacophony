import { expect } from 'chai';
import { FleetRouter } from '../FleetRouter';
import { Node } from '../../models/Node';
import { Task } from '../../models/Task';

describe('FleetRouter', () => {
  let fleetRouter: FleetRouter;
  let nodes: Node[];
  let tasks: Task[];

  beforeEach(() => {
    fleetRouter = new FleetRouter();
    nodes = [
      new Node({ id: 'node1', gpuMemory: 8192 }),
      new Node({ id: 'node2', gpuMemory: 4096 }),
      new Node({ id: 'node3', gpuMemory: 16384 })
    ];
    tasks = [
      new Task({ id: 'task1', requiredGpuMemory: 5120 }),
      new Task({ id: 'task2', requiredGpuMemory: 9216 })
    ];

    fleetRouter.nodes = nodes;
  });

  it('routes task with high VRAM to node with sufficient available GPU memory', async () => {
    const routedTask = await fleetRouter.routeTask(tasks[1]);
    expect(routedTask).to.equal(nodes[2].id);
  });

  it('does not route task with high VRAM to node with insufficient available GPU memory', async () => {
    const routedTask = await fleetRouter.routeTask(tasks[1]);
    expect(routedTask).not.to.equal(nodes[1].id);
  });

  it('routes multiple tasks correctly based on available GPU memory', async () => {
    const routedTasks = await Promise.all([
      fleetRouter.routeTask(tasks[0]),
      fleetRouter.routeTask(tasks[1])
    ]);
    expect(routedTasks).to.deep.equal([nodes[2].id, nodes[2].id]);
  });

  it('routes task with low VRAM to any available node', async () => {
    const routedTask = await fleetRouter.routeTask(tasks[0]);
    expect(nodes.some(node => routedTask === node.id)).to.be.true;
  });
});