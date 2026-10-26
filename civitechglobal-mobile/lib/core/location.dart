import 'package:flutter/services.dart';

/// Where the phone is, from MainActivity's location channel: Android's own
/// LocationManager, a coarse fix, the permission asked only on this call.
const _channel = MethodChannel('ir.rayantamaddonjahangostar.app/location');

typedef DeviceFix = ({double latitude, double longitude});

/// Why there is no fix.
enum LocationProblem {
  /// The reader said no; asking again only earns a second no.
  denied,

  /// Location is off, there is no signal, or the fix timed out.
  unavailable,
}

class LocationNotReady implements Exception {
  const LocationNotReady(this.problem);

  final LocationProblem problem;
}

Future<DeviceFix> currentLocation() async {
  try {
    final result = await _channel.invokeMapMethod<String, Object?>('current');
    final lat = result?['latitude'];
    final lng = result?['longitude'];
    if (lat is num && lng is num) {
      return (latitude: lat.toDouble(), longitude: lng.toDouble());
    }
    throw const LocationNotReady(LocationProblem.unavailable);
  } on PlatformException catch (e) {
    throw LocationNotReady(
      e.code == 'denied' ? LocationProblem.denied : LocationProblem.unavailable,
    );
  } on MissingPluginException {
    throw const LocationNotReady(LocationProblem.unavailable);
  }
}
