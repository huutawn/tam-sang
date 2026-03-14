package com.nht.core_service.config;

import java.util.List;

import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import lombok.extern.slf4j.Slf4j;

@Configuration
@Slf4j
public class DonationSchemaRepairConfig {

	private static final String TABLE_NAME = "donation";
	private static final String TARGET_COLUMN = "blockchain_tx_hash";
	private static final List<String> LEGACY_COLUMNS = List.of(
			"blockchainTxHash",
			"blockchaintxhash",
			"blockchain_txhash");

	@Bean
	ApplicationRunner repairDonationSchema(JdbcTemplate jdbcTemplate) {
		return args -> {
			if (!tableExists(jdbcTemplate, TABLE_NAME)) {
				return;
			}

			if (columnExists(jdbcTemplate, TABLE_NAME, TARGET_COLUMN)) {
				log.info("Donation schema already contains column {}", TARGET_COLUMN);
				return;
			}

			for (String legacyColumn : LEGACY_COLUMNS) {
				if (columnExists(jdbcTemplate, TABLE_NAME, legacyColumn)) {
					jdbcTemplate.execute(String.format(
							"ALTER TABLE %s RENAME COLUMN \"%s\" TO %s",
							TABLE_NAME,
							legacyColumn,
							TARGET_COLUMN));
					log.warn("Renamed legacy donation column {} -> {}", legacyColumn, TARGET_COLUMN);
					return;
				}
			}

			jdbcTemplate.execute(String.format(
					"ALTER TABLE %s ADD COLUMN IF NOT EXISTS %s VARCHAR(255)",
					TABLE_NAME,
					TARGET_COLUMN));
			log.warn("Added missing donation column {}", TARGET_COLUMN);
		};
	}

	private boolean tableExists(JdbcTemplate jdbcTemplate, String tableName) {
		Integer count = jdbcTemplate.queryForObject(
				"""
						SELECT COUNT(*)
						FROM information_schema.tables
						WHERE table_schema = 'public' AND table_name = ?
						""",
				Integer.class,
				tableName);
		return count != null && count > 0;
	}

	private boolean columnExists(JdbcTemplate jdbcTemplate, String tableName, String columnName) {
		Integer count = jdbcTemplate.queryForObject(
				"""
						SELECT COUNT(*)
						FROM information_schema.columns
						WHERE table_schema = 'public'
						  AND table_name = ?
						  AND column_name = ?
						""",
				Integer.class,
				tableName,
				columnName);
		return count != null && count > 0;
	}
}
