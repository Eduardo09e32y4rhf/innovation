import ast

with open('backend/server.py', 'r') as f:
    tree = ast.parse(f.read())

functions = [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]

for func in functions:
    if func.name == 'get_ticket':
        source = ast.unparse(func)
        assert 'TICKETS_MAP' in source, "get_ticket must use TICKETS_MAP"
        assert 'for ticket in MOCK_TICKETS' not in source, "get_ticket must not use loop"
    if func.name == 'update_ticket':
        source = ast.unparse(func)
        assert 'TICKETS_MAP' in source, "update_ticket must use TICKETS_MAP"
        assert 'for ticket in MOCK_TICKETS' not in source, "update_ticket must not use loop"
    if func.name == 'create_ticket':
        source = ast.unparse(func)
        assert 'TICKETS_MAP' in source, "create_ticket must update TICKETS_MAP"

print("AST validation passed!")
