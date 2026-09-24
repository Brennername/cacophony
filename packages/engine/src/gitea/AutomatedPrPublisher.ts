import { AutomatedPrWorkflow, type AutomatedPrOptions, type AutomatedPrResult } from "./AutomatedPrWorkflow.js";

/**
 * AutomatedPrPublisher alias export satisfying T39.2.1 interface requirements.
 */
export class AutomatedPrPublisher extends AutomatedPrWorkflow {}
export type { AutomatedPrOptions as PrPublishOptions, AutomatedPrResult as PrPublishResult };
