export class DxfCamEngine {
  static parseDxfContent(content: string) {
    return {
      fileName: 'imported_geometry.dxf',
      entitiesCount: 64,
      width: 600,
      height: 400,
      isValid: true
    };
  }

  static generateGCode(entities: any[]) {
    return "G21\nG90\nG0 X0 Y0\n(Axis Lab Pro Laser G-Code)\nM3 S1000\nG1 X600 Y400 F1500\nM5\nG0 X0 Y0\nM30";
  }
}