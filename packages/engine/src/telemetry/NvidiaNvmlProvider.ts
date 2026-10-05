interface GPUInfo {
  totalMemory: number;
  usedMemory: number;
  freeMemory: number;
  temperature: number;
  powerDrawWatts: number;
  smUtilization: number;
}

import { execSync } from 'child_process';

class NvidiaNvmlProvider {
  private static readonly NVML_QUERY_COMMAND = `
    nvidia-smi --query-gpu=memory.total,memory.used,memory.free,gpu_temp,power.draw,utilization.gpu --format=csv,noheader
  `;

  public async getGPUInfo(): Promise<GPUInfo[]> {
    try {
      const output = execSync(NvidiaNvmlProvider.NVML_QUERY_COMMAND).toString().trim();
      const lines = output.split('\n');
      return lines.map(line => parseNvmlData(line));
    } catch (error) {
      console.error('Failed to retrieve GPU information:', error);
      throw new Error('Failed to retrieve GPU information');
    }
  }
}

function parseNvmlData(line: string): GPUInfo {
  const [total, used, free, temp, powerDraw, utilization] = line.split(',').map(value => value.trim());
  if (total === undefined || used === undefined || free === undefined || temp === undefined || powerDraw === undefined || utilization === undefined) {
    throw new Error('Invalid data format from nvidia-smi');
  }
  return {
    totalMemory: parseFloat(total),
    usedMemory: parseFloat(used),
    freeMemory: parseFloat(free),
    temperature: parseInt(temp, 10), // Ensure base 10 for parseInt
    powerDrawWatts: parseFloat(powerDraw),
    smUtilization: parseInt(utilization, 10), // Ensure base 10 for parseInt
  };
}

export default NvidiaNvmlProvider;
