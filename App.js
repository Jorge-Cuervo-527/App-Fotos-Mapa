import React, { useState, useRef } from "react";
import { StyleSheet, Text, View, Image, TouchableOpacity, Modal, Alert, ActivityIndicator } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { CameraView, useCameraPermissions } from "expo-camera";

// Coordenadas iniciales centradas en Medellín
const MEDELLIN_REGION = {
  latitude: 6.244203,
  longitude: -75.581211,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
}

export default function App() {
  const [markers, setMarkers] = useState([]);
  const [tempCoordinate, setTempCoordinate] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const cameraRef = useRef(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const handleLongPress = (e) => {
    const coordinate = e.nativeEvent.coordinate;
    setTempCoordinate(coordinate);
    solicitarPermisosYAbrirCamara();
  }

  const solicitarPermisosYAbrirCamara = async () => {
    if(!cameraPermission?.granted){
      const cameraStatus = await requestCameraPermission();
      if(!cameraStatus.granted){
        Alert.alert("Permiso denegado", "Necesitamos acceso a la cámara para tomar fotos.");
        return;
      }
    }
    setShowCamera(true);
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      const options = { quality: 0.5, base64: false };
      const photo = await cameraRef.current.takePictureAsync(options);
      setCapturedImage(photo.uri);
      setShowCamera(false);
    }
  };

  const handleSaveMarker = async () => {
    if (!capturedImage || !tempCoordinate) {
      Alert.alert("Error", "No hay foto o coordenada para guardar.");
      return;
    }
    
    try {
      setIsUploading(true);
      
      const payLoad = {
        title: 'Nuevo pin con Foto en Medellín', 
        latitude: tempCoordinate.latitude,
        longitude: tempCoordinate.longitude,
        photoUri: capturedImage,
        userId: 1
      };

      await fetch('https://jsonplaceholder.typicode.com/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payLoad)
      });

      const newMarker = {
        id: Date.now().toString(),
        coordinate: tempCoordinate,
        photoUri: capturedImage
      };

      setMarkers([...markers, newMarker]);
      Alert.alert("Éxito", "Marcador agregado al mapa temporalmente.");
      setCapturedImage(null);
      setTempCoordinate(null);
    } catch (error) {
      console.error("Error al guardar el marcador:", error);
      Alert.alert("Error", "Ocurrió un error al guardar el marcador.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={MEDELLIN_REGION} 
        onLongPress={handleLongPress}
        provider={PROVIDER_GOOGLE} 
      >
        {markers.map((marker) => (
          <Marker key={marker.id} coordinate={marker.coordinate}>
            <Image source={{ uri: marker.photoUri }} style={styles.markerImage} />
          </Marker>
        ))}
      </MapView>

      <View style={styles.instructionBanner}>
        <Text style={styles.instructionText}>Mantén presionado en el mapa para tomar una foto</Text>
      </View>

      <Modal visible={showCamera} animationType="slide">
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} />
          <View style={styles.cameraButtonContainer}>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureInnerCircle} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCamera(false)}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!capturedImage} animationType="slide" transparent={true}>
        <View style={styles.previewContainer}>
          <View style={styles.previewCard}>
            <Text style={styles.previewTitle}>¿Guardar Marcador en esta posición?</Text>
            {capturedImage && (
              <Image source={{ uri: capturedImage }} style={styles.previewImage} />
            )}
            {isUploading ? (
              <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 15 }} />
            ) : (
              <View style={styles.previewButtonRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.discardButton]}
                  onPress={() => setCapturedImage(null)}
                >
                  <Text style={styles.actionButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={handleSaveMarker}
                >
                  <Text style={styles.actionButtonText}>Guardar</Text> 
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  map: { width: '100%', height: '100%' }, // La clave para que Android no colapse la vista
  markerImage: { width: 45, height: 45, borderRadius: 25, borderWidth: 2, borderColor: '#007AFF', backgroundColor: '#ddd' },
  instructionBanner: { position: 'absolute', top: 50, left: 20, right: 20, backgroundColor: 'rgba(0, 0, 0, 0.75)', padding: 12, borderRadius: 10, alignItems: 'center' },
  instructionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraButtonContainer: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  captureButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255, 255, 255, 0.3)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  captureInnerCircle: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },
  cancelButton: { backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  previewContainer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center' },
  previewCard: { backgroundColor: '#fff', borderRadius: 15, padding: 20, width: '85%', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  previewTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333', textAlign: 'center' },
  previewImage: { width: 200, height: 250, borderRadius: 10, marginBottom: 20 },
  previewButtonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  actionButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginHorizontal: 5 },
  discardButton: { backgroundColor: '#FF3B30' },
  saveButton: { backgroundColor: '#34C759' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});