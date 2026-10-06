import { execSync } from 'child_process';

interface GPUInfo {
  totalMemory: number;
  usedMemory: number;
  freeMemory: number;
  temperature: number;
  powerDrawWatts: number;
  smUtilization: number;
}

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

  public async getAggregatedGPUInfo(): Promise<GPUInfo> {
    try {
      const output = execSync(NvidiaNvmlProvider.NVML_QUERY_COMMAND).toString().trim();
      const lines = output.split('\n');
      const gpuInfos = lines.map(line => parseNvmlData(line));
      return aggregateGpuInfo(gpuInfos);
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

function aggregateGpuInfo(gpuInfos: GPUInfo[]): GPUInfo {
  let totalMemory = 0;
  let usedMemory = 0;
  let freeMemory = 0;
  let temperature = 0;
  let powerDrawWatts = 0;
  let smUtilization = 0;

  for (const gpuInfo of gpuInfos) {
    totalMemory += gpuInfo.totalMemory;
    usedMemory += gpuInfo.usedMemory;
    freeMemory += gpuInfo.freeMemory;
    temperature += gpuInfo.temperature;
    powerDrawWatts += gpuInfo.powerDrawWatts;
    smUtilization += gpuInfo.smUtilization;
  }

  return {
    totalMemory,
    usedMemory,
    freeMemory,
    temperature: Math.round(temperature / gpuInfos.length),
    powerDrawWatts: Math.round(powerDrawWatts / gpuInfos.length),
    smUtilization: Math.round(smUtilization / gpuInfos.length),
  };
}

export default NvidiaNvmlProvider;
