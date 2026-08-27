import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:smart_drain_funcionario/models/bueiro.dart';
import 'package:smart_drain_funcionario/models/previsao.dart';
import 'package:smart_drain_funcionario/services/api_service.dart';
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
  _testesEndereco();
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
    test('ALERTA, CRITICO e ENCHENTE precisam', () {
      expect(Bueiro.fromJson(_json(status: 'ALERTA')).precisaLimpeza, isTrue);
      expect(Bueiro.fromJson(_json(status: 'CRITICO')).precisaLimpeza, isTrue);
      // O pior caso de todos: já ficou de fora da lista uma vez.
      expect(Bueiro.fromJson(_json(status: 'ENCHENTE')).precisaLimpeza, isTrue);
    });

    test('TRANQUILO não precisa', () {
      expect(Bueiro.fromJson(_json(status: 'TRANQUILO')).precisaLimpeza, isFalse);
    });
  });

  group('regiao', () {
    test('sai do meio do id', () {
      expect(Bueiro.fromJson(_json()).regiao, 'centro');
    });

    test('id fora do padrão não derruba o filtro', () {
      final b = Bueiro.fromJson(_json()..['bueiro_id'] = 'avulso');
      expect(b.regiao, 'outros');
      expect(b.nomeLegivel, 'AVULSO');
    });
  });

  group('PrevisaoAlagamento.fromJson', () {
    test('lê o ranking e aponta o primeiro da fila', () {
      final p = PrevisaoAlagamento.fromJson({
        'chuva_24h_mm': 12,
        'bueiros': [
          {
            'bueiro_id': 'bueiro_centro_03',
            'risco': 78.2,
            'nivel': 'ALTO',
            'motivo': 'ponto mais baixo da região',
          },
          {'bueiro_id': 'bueiro_centro_01', 'risco': 30.0, 'nivel': 'BAIXO'},
        ],
      });
      expect(p.chuva24hMm, 12.0); // int do JSON não pode virar crash
      expect(p.maisArriscado!.bueiroId, 'bueiro_centro_03');
      expect(p.bueiros.last.motivo, ''); // campo ausente vira vazio, não null
    });

    test('resposta vazia não tem primeiro da fila', () {
      final p = PrevisaoAlagamento.fromJson({'chuva_24h_mm': 0, 'bueiros': []});
      expect(p.maisArriscado, isNull);
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

// ---------------------------------------------------------------------------
// Endereço do servidor, digitado à mão pelo funcionário na rua.
// ---------------------------------------------------------------------------
void _testesEndereco() {
  group('normalizarEndereco', () {
    test('coloca http:// quando falta', () {
      expect(ApiService.normalizarEndereco('192.168.0.10:5001'),
          'http://192.168.0.10:5001');
    });

    test('mantém https quando informado', () {
      expect(ApiService.normalizarEndereco('https://api.exemplo.com'),
          'https://api.exemplo.com');
    });

    test('tira barra do fim, senão a URL vira //api/login', () {
      expect(ApiService.normalizarEndereco('http://10.0.2.2:5001/'),
          'http://10.0.2.2:5001');
      expect(ApiService.normalizarEndereco('10.0.2.2:5001///'),
          'http://10.0.2.2:5001');
    });

    test('ignora espaços colados no começo e no fim', () {
      expect(ApiService.normalizarEndereco('  10.0.2.2:5001  '),
          'http://10.0.2.2:5001');
    });
  });
}
