# Adds the UI test target (ios/App/AppUITests) and a scheme for it to App.xcodeproj, for one CI
# run (.github/workflows/ios.yml). Kept out of the committed project so the app's own project
# stays what Capacitor generated. Uses the xcodeproj gem that ships with CocoaPods.
require 'xcodeproj'

dir = File.expand_path('../App', __dir__)
proj = Xcodeproj::Project.open(File.join(dir, 'App.xcodeproj'))
app = proj.targets.find { |t| t.name == 'App' }
tests = proj.targets.find { |t| t.name == 'AppUITests' } || proj.new_target(:ui_test_bundle, 'AppUITests', :ios, '26.0')
tests.add_dependency(app)
group = proj.main_group.find_subpath('AppUITests', false) || proj.main_group.new_group('AppUITests', 'AppUITests')
ref = group.files.find { |f| f.path == 'OpenGymUITests.swift' } || group.new_file('OpenGymUITests.swift')
tests.add_file_references([ref]) unless tests.source_build_phase.files_references.include?(ref)
tests.build_configurations.each do |c|
  s = c.build_settings
  s['TEST_TARGET_NAME'] = 'App'
  s['PRODUCT_NAME'] = '$(TARGET_NAME)'
  s['PRODUCT_BUNDLE_IDENTIFIER'] = 'ch.redurbabat.redfit.uitests'
  s['SWIFT_VERSION'] = '5.0'
  s['IPHONEOS_DEPLOYMENT_TARGET'] = '26.0'
  s['GENERATE_INFOPLIST_FILE'] = 'YES'
  s['TARGETED_DEVICE_FAMILY'] = '1,2'
  s['CODE_SIGN_STYLE'] = 'Automatic'
end
proj.save

scheme = Xcodeproj::XCScheme.new
scheme.add_build_target(app)
scheme.set_launch_target(app)
scheme.add_test_target(tests)
scheme.save_as(File.join(dir, 'App.xcodeproj'), 'AppUITests', true)
puts 'added AppUITests'
