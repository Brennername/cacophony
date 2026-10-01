-- Migration file to create table bandit_arms

CREATE TABLE IF NOT EXISTS bandit_arms (
    arm_id SERIAL PRIMARY KEY,
    model_id INT NOT NULL,
    role VARCHAR(255) NOT NULL,
    alpha DECIMAL(10, 4) NOT NULL DEFAULT 0.0,
    beta DECIMAL(10, 4) NOT NULL DEFAULT 0.0,
    total_reward DECIMAL(10, 4) NOT NULL DEFAULT 0.0,
    trials_count INT NOT NULL DEFAULT 0
);

-- Adding comments to the table and columns for clarity

COMMENT ON TABLE bandit_arms IS 'Table to store information about different arms in a multi-armed bandit model';
COMMENT ON COLUMN bandit_arms.arm_id IS 'Unique identifier for each arm';
COMMENT ON COLUMN bandit_arms.model_id IS 'Identifier for the model associated with the arm';
COMMENT ON COLUMN bandit_arms.role IS 'Role or type of the arm within the model';
COMMENT ON COLUMN bandit_arms.alpha IS 'Alpha parameter for the arm, used in Bayesian calculations';
COMMENT ON COLUMN bandit_arms.beta IS 'Beta parameter for the arm, used in Bayesian calculations';
COMMENT ON COLUMN bandit_arms.total_reward IS 'Total reward accumulated by the arm';
COMMENT ON COLUMN bandit_arms.trials_count IS 'Number of trials conducted with this arm';

-- Adding a foreign key constraint to ensure model_id references an existing model

ALTER TABLE bandit_arms
ADD CONSTRAINT fk_model_id FOREIGN KEY (model_id) REFERENCES models(model_id);