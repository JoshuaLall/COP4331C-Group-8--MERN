import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'brand_tokens.dart';

ThemeData buildAppTheme() {
  final textTheme = GoogleFonts.dmSansTextTheme().copyWith(
    headlineSmall: GoogleFonts.dmSerifDisplay(
      fontSize: 30,
      color: BrandTokens.ink,
    ),
    headlineMedium: GoogleFonts.dmSerifDisplay(
      fontSize: 34,
      color: BrandTokens.ink,
    ),
    titleLarge: GoogleFonts.dmSerifDisplay(
      fontSize: 24,
      color: BrandTokens.ink,
    ),
    titleMedium: GoogleFonts.dmSans(
      fontSize: 16,
      fontWeight: FontWeight.w700,
      color: BrandTokens.ink,
    ),
    bodyLarge: GoogleFonts.dmSans(
      fontSize: 15,
      color: BrandTokens.ink,
    ),
    bodyMedium: GoogleFonts.dmSans(
      fontSize: 14,
      color: BrandTokens.inkSoft,
    ),
    labelLarge: GoogleFonts.dmSans(
      fontSize: 14,
      fontWeight: FontWeight.w700,
      color: BrandTokens.creamLight,
    ),
  );

  return ThemeData(
    colorScheme: ColorScheme.fromSeed(
      seedColor: BrandTokens.terracotta,
      brightness: Brightness.light,
      primary: BrandTokens.terracotta,
      secondary: BrandTokens.sand,
      surface: BrandTokens.creamSoft,
    ),
    scaffoldBackgroundColor: BrandTokens.cream,
    textTheme: textTheme,
    useMaterial3: true,
    appBarTheme: AppBarTheme(
      backgroundColor: BrandTokens.creamSoft,
      foregroundColor: BrandTokens.ink,
      elevation: 0,
      titleTextStyle: GoogleFonts.dmSerifDisplay(
        fontSize: 24,
        color: BrandTokens.ink,
      ),
    ),
    inputDecorationTheme: const InputDecorationTheme(
      filled: true,
      fillColor: BrandTokens.creamLight,
      labelStyle: TextStyle(
        color: BrandTokens.inkSoft,
        fontWeight: FontWeight.w600,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.all(Radius.circular(18)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.all(Radius.circular(18)),
        borderSide: BorderSide(color: BrandTokens.borderDark),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.all(Radius.circular(18)),
        borderSide: BorderSide(color: BrandTokens.terracotta, width: 1.6),
      ),
    ),
    cardTheme: const CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(24)),
        side: BorderSide(color: BrandTokens.border),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: BrandTokens.terracotta,
        foregroundColor: BrandTokens.creamLight,
        minimumSize: const Size.fromHeight(48),
        textStyle: GoogleFonts.dmSans(
          fontSize: 15,
          fontWeight: FontWeight.w700,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: BrandTokens.inkSoft,
        side: const BorderSide(color: BrandTokens.borderDark, width: 1.5),
        minimumSize: const Size.fromHeight(48),
        textStyle: GoogleFonts.dmSans(
          fontSize: 14,
          fontWeight: FontWeight.w600,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: BrandTokens.creamLight,
      selectedColor: BrandTokens.terracotta,
      side: const BorderSide(color: BrandTokens.borderDark),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(999),
      ),
      labelStyle: GoogleFonts.dmSans(
        color: BrandTokens.inkSoft,
        fontWeight: FontWeight.w600,
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: BrandTokens.creamSoft,
      indicatorColor: BrandTokens.sand,
      labelTextStyle: WidgetStatePropertyAll(
        GoogleFonts.dmSans(
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    ),
  );
}
