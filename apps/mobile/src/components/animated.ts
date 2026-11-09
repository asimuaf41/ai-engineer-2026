import Animated from "react-native-reanimated";
import { withUniwind } from "uniwind";

// An Animated.View that also takes className (token classes), so animated views never need StyleSheet colors.
export const AnimatedView = withUniwind(Animated.View);
