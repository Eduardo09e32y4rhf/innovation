// Smoke test básico: garante que o app sobe sem quebrar.
//
// Rode com: flutter test

import 'package:flutter_test/flutter_test.dart';
import 'package:innovation_app/main.dart';

void main() {
  testWidgets('App inicia e mostra Innovation', (WidgetTester tester) async {
    await tester.pumpWidget(const InnovationApp());
    await tester.pumpAndSettle();

    expect(find.text('Innovation'), findsWidgets);
  });
}
