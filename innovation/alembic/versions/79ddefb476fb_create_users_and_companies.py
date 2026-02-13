"""create users and companies

Revision ID: 79ddefb476fb
Revises: 
Create Date: 2026-01-18 11:35:10.965046

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '79ddefb476fb'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Criar a tabela de Usuários (sem o vínculo de empresa ativa ainda)
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('email', sa.String(length=180), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=30), nullable=False),
        sa.Column('terms_accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('terms_version', sa.String(length=20), nullable=True),
        sa.Column('active_company_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # 2. Criar a tabela de Empresas (agora que 'users' já existe para o owner_user_id)
    op.create_table('companies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('owner_user_id', sa.Integer(), nullable=False),
        sa.Column('razao_social', sa.String(length=200), nullable=False),
        sa.Column('cnpj', sa.String(length=20), nullable=False),
        sa.Column('cidade', sa.String(length=120), nullable=False),
        sa.Column('uf', sa.String(length=2), nullable=False),
        sa.Column('logo_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['owner_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('cnpj')
    )
    op.create_index(op.f('ix_companies_id'), 'companies', ['id'], unique=False)

    # 3. Agora adicionamos o vínculo que faltava em users (active_company_id)
    op.create_foreign_key('fk_users_active_company', 'users', 'companies', ['active_company_id'], ['id'])


def downgrade() -> None:
    # Remover o vínculo circular primeiro
    op.drop_constraint('fk_users_active_company', 'users', type_='foreignkey')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_index(op.f('ix_companies_id'), table_name='companies')
    op.drop_table('companies')