from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


def make_alembic_config(database_url: str) -> Config:
    backend_dir = Path(__file__).resolve().parents[1]
    config = Config(str(backend_dir / 'alembic.ini'))
    config.set_main_option('script_location', str(backend_dir / 'alembic'))
    config.set_main_option('sqlalchemy.url', database_url)
    return config


@pytest.mark.asyncio
async def test_alembic_upgrade_and_downgrade_work_on_empty_database(tmp_path):
    database_path = tmp_path / 'migration-check.db'
    async_database_url = f'sqlite+aiosqlite:///{database_path}'
    sync_database_url = f'sqlite:///{database_path}'
    config = make_alembic_config(sync_database_url)

    command.upgrade(config, 'head')

    engine = create_async_engine(async_database_url)
    async with engine.connect() as connection:
        result = await connection.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='roles'"))
        assert result.scalar_one() == 'roles'
    await engine.dispose()

    command.downgrade(config, 'base')
