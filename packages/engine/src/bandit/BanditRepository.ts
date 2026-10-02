import { BanditArm } from '@cacophony/shared-types';
import { updateBanditArms } from '../db/BanditArmRepository';

/**
 * Updates the alpha and beta values of bandit arms based on their reward.
 * Arms with a reward >= 0.5 are marked as successful (alpha = 1, beta = 0),
 * while those with a reward < 0.5 are marked as failures (alpha = 0, beta = 1).
 *
 * @param {BanditArm[]} arms - The array of bandit arms to update.
 */
export async function updateBanditArmsBasedOnReward(arms: BanditArm[]): Promise<void> {
  const updatedArms = arms.map((arm) => {
    if (arm.reward >= 0.5) {
      return { ...arm, alpha: 1, beta: 0 };
    } else {
      return { ...arm, alpha: 0, beta: 1 };
    }
  });

  await updateBanditArms(updatedArms);
}