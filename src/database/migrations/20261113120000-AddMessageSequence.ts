import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageSequence20261113120000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE messages ADD COLUMN sequence bigint`);
    // Preserve the previous deterministic order for legacy rows. Timestamp ties
    // cannot reveal the original insertion order and remain ordered by UUID.
    await queryRunner.query(`WITH ordered AS (
      SELECT id, row_number() OVER (ORDER BY created_at, id) AS position FROM messages
    ) UPDATE messages SET sequence = ordered.position FROM ordered WHERE messages.id = ordered.id`);
    await queryRunner.query(
      `CREATE SEQUENCE messages_sequence_seq OWNED BY messages.sequence`,
    );
    await queryRunner.query(
      `SELECT setval('messages_sequence_seq', COALESCE((SELECT MAX(sequence) FROM messages), 0) + 1, false)`,
    );
    await queryRunner.query(
      `ALTER TABLE messages ALTER COLUMN sequence SET DEFAULT nextval('messages_sequence_seq'), ALTER COLUMN sequence SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE messages ADD CONSTRAINT UQ_messages_sequence UNIQUE (sequence)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE messages DROP COLUMN sequence`);
  }
}
