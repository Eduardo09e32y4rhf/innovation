import 'package:flutter/material.dart';

BoxDecoration appGradient() {
  return const BoxDecoration(
    gradient: LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [
        Color(0xFF2B0A3D),
        Color(0xFF4A1E8C),
        Color(0xFF1A237E),
      ],
    ),
  );
}
