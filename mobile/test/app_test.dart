import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_drain_funcionario/models/bueiro.dart';
import 'package:smart_drain_funcionario/widgets/bueiro_card.dart';

/// Resposta de /api/bueiros/tempo-real, como o backend devolve de verdade.
Map<String, dynamic> _json({
  String status = 'ALERTA',
  num capacidade = 72,
  dynamic bateria = 88,
}) {
  return {
    'bueiro_id': 'bueiro_centro_02',
    'latitude': -22.25781,
    'longitude': -45.697985,
    'capacidade_porcentagem': capacidade,
    'status_codigo': status,
    'status_mensagem': 'Obstrução alta',
    'status_bateria': bateria,
    'qualidade_conexao': 'Boa (Estável)',
    'timestamp': '2026-08-10T13:28:21.212545',
  };
}

void main() {
  group('Bueiro.fromJson', () {
    test('lê a resposta da API', () {
      final b = Bueiro.fromJson(_json());
      expect(b.bueiroId, 'bueiro_centro_02');
      expect(b.capacidadePorcentagem, 72);
      expect(b.statusCodigo, 'ALERTA');
    });

    test('aceita int onde espera double', () {
      // O Postgres devolve 80 (int) quando a capacidade é redonda; sem o
      // toDouble o parsing estoura em runtime.
      final b = Bueiro.fromJson(_json(capacidade: 80));
      expect(b.capacidadePorcentagem, 80.0);
    });

    test('não quebra com campos ausentes ou nulos', () {
      final incompleto = _json()
        ..remove('status_mensagem')
        ..['status_bateria'] = null
        ..['qualidade_conexao'] = null;
      final b = Bueiro.fromJson(incompleto);
      expect(b.statusMensagem, '');
      expect(b.statusBateria, '-');
      expect(b.qualidadeConexao, '-');
    });

    test('timestamp inválido não derruba a lista', () {
      final b = Bueiro.fromJson(_json()..['timestamp'] = 'nao-e-data');
      expect(b.timestamp, isA<DateTime>());
    });
  });

  group('precisaLimpeza', () {
    test('ALERTA e CRITICO precisam', () {
      expect(Bueiro.fromJson(_json(status: 'ALERTA')).precisaLimpeza, isTrue);
      expect(Bueiro.fromJson(_json(status: 'CRITICO')).precisaLimpeza, isTrue);
    });

    test('TRANQUILO não precisa', () {
      expect(Bueiro.fromJson(_json(status: 'TRANQUILO')).precisaLimpeza, isFalse);
    });
  });

  group('BueiroCard', () {
    Future<void> montar(WidgetTester tester, {double? distancia}) {
      return tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: BueiroCard(
            bueiro: Bueiro.fromJson(_json()),
            distanciaMetros: distancia,
            onTap: () {},
          ),
        ),
      ));
    }

    testWidgets('mostra nome legível, nível e status', (tester) async {
      await montar(tester, distancia: 120);
      expect(find.text('CENTRO 02'), findsOneWidget); // não "bueiro_centro_02"
      expect(find.text('72'), findsOneWidget);
      expect(find.text('ALERTA'), findsOneWidget);
    });

    testWidgets('formata distância em m e km', (tester) async {
      await montar(tester, distancia: 120);
      expect(find.text('120 m'), findsOneWidget);

      await montar(tester, distancia: 2500);
      expect(find.text('2.5 km'), findsOneWidget);
    });

    testWidgets('sem posição mostra traço em vez de estourar', (tester) async {
      await montar(tester);
      expect(find.text('--'), findsOneWidget);
    });

    testWidgets('o cartão tem altura: o medidor já colapsou tudo para zero',
        (tester) async {
      await montar(tester, distancia: 120);
      expect(tester.getSize(find.byType(BueiroCard)).height, greaterThan(60));
    });
  });
}
