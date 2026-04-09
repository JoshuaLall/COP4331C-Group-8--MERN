import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/brand_tokens.dart';

class BrandLogo extends StatelessWidget {
  const BrandLogo({
    super.key,
    this.size = 34,
    this.center = false,
  });

  final double size;
  final bool center;

  @override
  Widget build(BuildContext context) {
    final style = GoogleFonts.dmSerifDisplay(
      fontSize: size,
      fontWeight: FontWeight.w400,
      height: 1,
      letterSpacing: -0.8,
    );

    return RichText(
      textAlign: center ? TextAlign.center : TextAlign.start,
      text: TextSpan(
        children: [
          TextSpan(
            text: 'Our',
            style: style.copyWith(color: BrandTokens.ink),
          ),
          TextSpan(
            text: 'Place',
            style: style.copyWith(
              color: BrandTokens.terracotta,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }
}
