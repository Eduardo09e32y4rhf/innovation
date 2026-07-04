import re

def fix_dto(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find @IsBoolean() pisFirstJob?: boolean; and add firstJob?: boolean;
    if 'firstJob?: boolean;' not in content:
        content = content.replace('pisFirstJob?: boolean;', 'pisFirstJob?: boolean;\n\n  @IsOptional()\n  @IsBoolean()\n  firstJob?: boolean;')

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_dto('apps/api/src/modules/employees/dto/create-employee.dto.ts')
fix_dto('apps/api/src/modules/employees/dto/update-employee.dto.ts')
print('DTOs patched')
