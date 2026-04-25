import { DataSource } from 'typeorm';

import { createDataSourceConfig } from './database.config';

export default new DataSource(createDataSourceConfig());
