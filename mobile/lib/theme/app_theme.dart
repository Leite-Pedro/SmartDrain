
import 'package:flutter/material.dart';

/// Paleta do Smart Drain.
///
/// Tema claro de propósito: o app é usado na rua, sob sol direto, onde fundo
/// escuro desperdiça o brilho da tela.
///
/// As cores são as mesmas da dashboard — azul e a família de cinzas slate do
/// Tailwind — para que app e site pareçam o mesmo produto. Quem vê os dois na
/// mesma apresentação não deve ter dúvida de que são o mesmo sistema.
///
/// Os nomes vieram da paleta anterior, de obra. Foram mantidos porque são
/// usados em dez arquivos e renomear seria só barulho no diff; leia-os como
/// papéis (fundo, texto, acento), não como cores literais.
class AppColors {
  AppColors._();

  static const Color concreto = Color(0xFFF8FAFC); // fundo (slate-50)
  static const Color superficie = Color(0xFFFFFFFF); // cartões
  static const Color piche = Color(0xFF0F172A); // texto principal (slate-900)
  static const Color fumaca = Color(0xFF64748B); // texto secundário (slate-500)
  static const Color borda = Color(0xFFE2E8F0); // slate-200

  /// Acento único, o mesmo azul da dashboard (blue-600 do Tailwind).
  ///
  /// Sempre com texto BRANCO em cima. Preto sobre este azul dá 4,3:1 e reprova
  /// em acessibilidade para texto normal; branco dá 5,2:1 e passa. Era o
  /// contrário no laranja anterior, então quem mexer aqui precisa conferir de
  /// novo — não é detalhe de gosto.
  static const Color sinal = Color(0xFF2563EB);

  // Níveis de obstrução, nas mesmas famílias da dashboard (emerald, amber e
  // red), mas no tom 700 em vez do 500: os rótulos de status têm 11 px, e o
  // tom claro do site reprovaria em contraste nesse tamanho. Mesma cor de
  // longe, legível de perto e ao sol.
  static const Color nivelOk = Color(0xFF047857);
  static const Color nivelAlerta = Color(0xFFB45309);
  static const Color nivelCritico = Color(0xFFB91C1C);

  /// Cor do nível a partir do código de status vindo do sensor.
  static Color doStatus(String statusCodigo) {
    switch (statusCodigo) {
      case 'CRITICO':
      case 'ENCHENTE':
        return nivelCritico;
      case 'ALERTA':
        return nivelAlerta;
      default:
        return nivelOk;
    }
  }
}

/// Tipografia: sem fonte externa de propósito — `google_fonts` baixaria o arquivo
/// em tempo de execução, e este app trabalha em rua com rede ruim. O caráter vem
/// do contraste entre números grandes e rótulos minúsculos em caixa alta.
class AppText {
  AppText._();

  /// Números (nível, distância). Figuras tabulares porque a lista se atualiza a
  /// cada 20 s: sem isso os dígitos mudam de largura e o número "dança".
  static const TextStyle numeroGrande = TextStyle(
    fontSize: 40,
    fontWeight: FontWeight.w700,
    height: 1,
    letterSpacing: -1.5,
    color: AppColors.piche,
    fontFeatures: [FontFeature.tabularFigures()],
  );

  static const TextStyle numero = TextStyle(
    fontSize: 15,
    fontWeight: FontWeight.w700,
    height: 1,
    color: AppColors.piche,
    fontFeatures: [FontFeature.tabularFigures()],
  );

  /// Rótulo em caixa alta. O contraponto miúdo dos números.
  static const TextStyle rotulo = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w700,
    letterSpacing: 1.2,
    color: AppColors.fumaca,
  );

  static const TextStyle titulo = TextStyle(
    fontSize: 17,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
    color: AppColors.piche,
  );

  static const TextStyle corpo = TextStyle(
    fontSize: 14,
    height: 1.4,
    color: AppColors.fumaca,
  );
}

class AppTheme {
  AppTheme._();

  static ThemeData get claro {
    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: AppColors.concreto,
      colorScheme: const ColorScheme.light(
        primary: AppColors.sinal,
        onPrimary: Colors.white,
        surface: AppColors.superficie,
        onSurface: AppColors.piche,
        error: AppColors.nivelCritico,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.concreto,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: AppColors.piche,
          fontSize: 18,
          fontWeight: FontWeight.w600,
          letterSpacing: -0.2,
        ),
        iconTheme: IconThemeData(color: AppColors.piche),
      ),
      cardTheme: CardThemeData(
        color: AppColors.superficie,
        elevation: 0,
        // Raio pequeno: o assunto é tampa de ferro e boca de lobo, não bolha.
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.superficie,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        border: _borda(AppColors.borda),
        enabledBorder: _borda(AppColors.borda),
        focusedBorder: _borda(AppColors.sinal, largura: 2),
        errorBorder: _borda(AppColors.nivelCritico),
        focusedErrorBorder: _borda(AppColors.nivelCritico, largura: 2),
        labelStyle: AppText.rotulo,
        floatingLabelStyle: const TextStyle(
          color: AppColors.piche,
          fontSize: 12,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.2,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.sinal,
          foregroundColor: Colors.white,
          disabledBackgroundColor: AppColors.borda,
          disabledForegroundColor: AppColors.fumaca,
          elevation: 0,
          // Alvo generoso: usado em pé, na rua, às vezes de luva.
          minimumSize: const Size.fromHeight(58),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
          textStyle: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.3,
          ),
        ),
      ),
      snackBarTheme: const SnackBarThemeData(
        backgroundColor: AppColors.piche,
        contentTextStyle: TextStyle(color: Colors.white, fontSize: 14),
        behavior: SnackBarBehavior.floating,
      ),
      textTheme: const TextTheme(
        bodyMedium: AppText.corpo,
        bodySmall: AppText.rotulo,
        titleMedium: AppText.titulo,
      ),
      useMaterial3: true,
    );
  }

  static OutlineInputBorder _borda(Color cor, {double largura = 1}) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(4),
      borderSide: BorderSide(color: cor, width: largura),
    );
  }
}
