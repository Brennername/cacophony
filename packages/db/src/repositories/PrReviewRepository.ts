interface IDatabaseDriver { [key: string]: any; }
import { PrReviewRecord } from '@cacophony/shared-types';
import { DatabaseDriverFactory } from '../drivers/DatabaseDriverFactory.js';

export class PrReviewRepository {
  private dbDriver: IDatabaseDriver;

  constructor() {
    this.dbDriver = DatabaseDriverFactory.createDriver();
  }

  /**
   * Persists a review record in the pr_reviews database table.
   * @param reviewRecord - The review record to persist.
   */
  public async saveReview(reviewRecord: PrReviewRecord): Promise<void> {
    try {
      await this.dbDriver.insert('pr_reviews', reviewRecord);
    } catch (error) {
      throw new Error(`Failed to save review record: ${error}`);
    }
  }

  /**
   * Retrieves a review record from the pr_reviews database table by its ID.
   * @param id - The ID of the review record to retrieve.
   */
  public async getReviewById(id: number): Promise<PrReviewRecord | null> {
    try {
      const result = await this.dbDriver.select('pr_reviews', { id });
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      throw new Error(`Failed to retrieve review record by ID: ${error}`);
    }
  }

  /**
   * Updates an existing review record in the pr_reviews database table.
   * @param reviewRecord - The updated review record.
   */
  public async updateReview(reviewRecord: PrReviewRecord): Promise<void> {
    try {
      await this.dbDriver.update('pr_reviews', reviewRecord, { id: reviewRecord.id });
    } catch (error) {
      throw new Error(`Failed to update review record: ${error}`);
    }
  }

  /**
   * Deletes a review record from the pr_reviews database table by its ID.
   * @param id - The ID of the review record to delete.
   */
  public async deleteReview(id: number): Promise<void> {
    try {
      await this.dbDriver.delete('pr_reviews', { id });
    } catch (error) {
      throw new Error(`Failed to delete review record by ID: ${error}`);
    }
  }
}