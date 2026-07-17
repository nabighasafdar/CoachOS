import { Image, StyleSheet, View } from 'react-native';

type ArtworkVariant = 'welcome' | 'signIn' | 'register';

const artwork = {
  welcome: require('../../IMAGES/images-2.jpeg'),
  signIn: require('../../IMAGES/images-3.jpeg'),
  register: require('../../IMAGES/images-4.jpeg'),
};

export function AuthArtwork({
  compact = false,
  variant = 'welcome',
}: {
  compact?: boolean;
  variant?: ArtworkVariant;
}) {
  return (
    <View style={[styles.backdrop, compact && styles.compact]}>
      <View style={[styles.glow, styles.glowPink]} />
      <View style={[styles.glow, styles.glowMint]} />
      <View style={[styles.glow, styles.glowPeach]} />
      <Image
        source={artwork[variant]}
        style={[styles.artwork, compact && styles.artworkCompact]}
        resizeMode="cover"
      />
      {variant === 'welcome' ? (
        <Image
          source={require('../../IMAGES/images.jpeg')}
          style={styles.accentArtwork}
          resizeMode="contain"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    backgroundColor: '#F7DCE8',
  },
  compact: {
    backgroundColor: '#DDF1E7',
  },
  artwork: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: '58%',
    opacity: 0.93,
  },
  artworkCompact: {
    height: 280,
  },
  accentArtwork: {
    position: 'absolute',
    right: -28,
    top: 40,
    width: 150,
    height: 190,
    opacity: 0.42,
  },
  glow: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
    opacity: 0.72,
  },
  glowPink: {
    backgroundColor: '#F2B9D4',
    left: -145,
    top: -90,
  },
  glowMint: {
    backgroundColor: '#BEE9DC',
    right: -150,
    top: -30,
  },
  glowPeach: {
    backgroundColor: '#FFD4BF',
    left: 40,
    top: 120,
  },
});
